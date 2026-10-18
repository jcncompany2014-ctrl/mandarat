# iCloud 맞추기 — 기기마다 복제본 파일 하나(Sync/v1/<dev>.jsonz)를 iCloud 컨테이너의 숨은 Data 자리에 쓰고 읽는 로컬 모듈.
# 앱 안 모듈이라 꾸러미 파일이 없어 값을 여기에 적는다(pro-store와 같은 꼴).
Pod::Spec.new do |s|
  s.name           = 'ICloudSync'
  s.version        = '1.0.0'
  s.summary        = 'Per-device replica files in the iCloud container'
  s.description    = 'Per-device replica files in the iCloud container'
  s.license        = 'UNLICENSED'
  s.author         = 'jcncompany'
  s.homepage       = 'https://github.com/jcncompany2014-ctrl/mandarat'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/jcncompany2014-ctrl/mandarat.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'Foundation', 'UIKit', 'CryptoKit'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
