// 프로(한 번 결제) — StoreKit 2. 상품은 Non-Consumable 하나, 갖고 있는지는 늘 StoreKit에 묻는다.
// JS 쪽은 modules/pro-store/index.ts(requireOptionalNativeModule('ProStore')), 상태는 src/lib/pro.ts의 reduceProState.
//
// 오류 코드(errorKind가 읽는다): E_NETWORK · E_NOT_ALLOWED · E_UNAVAILABLE · E_CANCELLED · E_UNKNOWN
// purchase 결과: 'purchased' · 'pending' · 'cancelled' · 'unverified'
import ExpoModulesCore
import StoreKit
import UIKit

struct ProProductRecord: Record {
  @Field var id: String = ""
  @Field var displayPrice: String = ""
  @Field var displayName: String = ""
}

public class ProStoreModule: Module {
  /// Transaction.updates를 듣는 일 — 앱 밖에서 끝난 결제(Ask to Buy 승인, 다른 기기, 환불)가 여기로 온다
  private var updates: Task<Void, Never>?

  public func definition() -> ModuleDefinition {
    Name("ProStore")

    Events("onEntitlementChange")

    OnCreate {
      // 일(Task)은 self를 붙잡지 않고 알림 보내기만 넘겨받는다 — 모듈이 사라지면(OnDestroy가 cancel) 다음 거래에서 스스로 끝난다
      let emit: @Sendable (String, Bool) -> Void = { [weak self] id, owned in
        self?.sendEvent("onEntitlementChange", ["id": id, "owned": owned])
      }
      self.updates = Task.detached {
        for await result in Transaction.updates {
          if Task.isCancelled { return }
          // 확인된 거래만 마무리한다 — 확인되지 않은 것은 열지 않고 그대로 둔다
          guard case .verified(let transaction) = result else { continue }
          await transaction.finish()
          emit(transaction.productID, await ProStoreModule.isOwned(transaction.productID))
        }
      }
    }

    OnDestroy {
      self.updates?.cancel()
      self.updates = nil
    }

    /// 이 기기에서 결제할 수 있는가(스크린 타임 제한이면 false)
    Function("canPay") { () -> Bool in
      return AppStore.canMakePayments
    }

    AsyncFunction("product") { (id: String) async throws -> ProProductRecord in
      let product = try await ProStoreModule.load(id)
      var record = ProProductRecord()
      record.id = product.id
      record.displayPrice = product.displayPrice
      record.displayName = product.displayName
      return record
    }

    AsyncFunction("purchase") { (id: String) async throws -> String in
      guard AppStore.canMakePayments else { throw ProStoreModule.error("E_NOT_ALLOWED", "Payments are not allowed on this device") }
      let product = try await ProStoreModule.load(id)
      let result: Product.PurchaseResult
      do {
        result = try await ProStoreModule.buy(product)
      } catch {
        throw ProStoreModule.mapped(error)
      }
      switch result {
      case .success(.verified(let transaction)):
        await transaction.finish()
        return "purchased"
      case .success(.unverified(_, _)):
        return "unverified"
      case .pending:
        return "pending"
      case .userCancelled:
        return "cancelled"
      @unknown default:
        throw ProStoreModule.error("E_UNKNOWN", "Unknown purchase result")
      }
    }

    AsyncFunction("owned") { (id: String) async -> Bool in
      return await ProStoreModule.isOwned(id)
    }

    /// 구입 복원 — App Store와 거래를 맞춘 뒤(로그인 창이 뜰 수 있다) 다시 묻는다
    AsyncFunction("restore") { (id: String) async throws -> Bool in
      do {
        try await AppStore.sync()
      } catch {
        throw ProStoreModule.mapped(error)
      }
      return await ProStoreModule.isOwned(id)
    }
  }

  // MARK: - 도우미

  /// 확인된 권리 가운데 환불·취소되지 않은 이 상품이 있는가
  static func isOwned(_ id: String) async -> Bool {
    for await result in Transaction.currentEntitlements {
      guard case .verified(let transaction) = result else { continue }
      if transaction.productID == id && transaction.revocationDate == nil {
        return true
      }
    }
    return false
  }

  static func load(_ id: String) async throws -> Product {
    let products: [Product]
    do {
      products = try await Product.products(for: [id])
    } catch {
      throw mapped(error)
    }
    guard let product = products.first(where: { $0.id == id }) else {
      throw error("E_UNAVAILABLE", "Product \(id) is not available")
    }
    return product
  }

  /// 창 찾기와 결제를 main에서 한 번에 — 둘 사이에 창(아이패드의 여러 창)이 닫혀도 엇갈리지 않게
  @MainActor
  static func buy(_ product: Product) async throws -> Product.PurchaseResult {
    if #available(iOS 17.0, *), let scene = activeScene() {
      return try await product.purchase(confirmIn: scene)
    }
    return try await product.purchase()
  }

  /// 결제 확인 창을 띄울 화면 — 앞에 나와 있는 창의 scene(아이패드에서 여러 창일 때)
  @MainActor
  static func activeScene() -> UIWindowScene? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    return scenes.first { $0.activationState == .foregroundActive }
      ?? scenes.first { $0.activationState == .foregroundInactive }
      ?? scenes.first
  }

  static func error(_ code: String, _ description: String) -> Exception {
    return Exception(name: "ProStoreError", description: description, code: code)
  }

  /// StoreKit 오류를 JS가 읽는 코드로
  static func mapped(_ error: Error) -> Exception {
    if let exception = error as? Exception {
      return exception
    }
    if let storeError = error as? StoreKitError {
      switch storeError {
      case .networkError:
        return self.error("E_NETWORK", storeError.localizedDescription)
      case .userCancelled:
        return self.error("E_CANCELLED", storeError.localizedDescription)
      case .notAvailableInStorefront, .notEntitled:
        return self.error("E_UNAVAILABLE", storeError.localizedDescription)
      default:
        return self.error("E_UNKNOWN", storeError.localizedDescription)
      }
    }
    if let purchaseError = error as? Product.PurchaseError {
      switch purchaseError {
      case .purchaseNotAllowed:
        return self.error("E_NOT_ALLOWED", purchaseError.localizedDescription)
      case .productUnavailable:
        return self.error("E_UNAVAILABLE", purchaseError.localizedDescription)
      default:
        return self.error("E_UNKNOWN", purchaseError.localizedDescription)
      }
    }
    if (error as NSError).domain == NSURLErrorDomain {
      return self.error("E_NETWORK", error.localizedDescription)
    }
    return self.error("E_UNKNOWN", error.localizedDescription)
  }
}
