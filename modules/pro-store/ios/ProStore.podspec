# 프로(한 번 결제) — StoreKit 2 로컬 모듈. 앱 안 모듈이라 꾸러미 파일이 없어 값을 여기에 적는다.
Pod::Spec.new do |s|
  s.name           = 'ProStore'
  s.version        = '1.0.0'
  s.summary        = 'One-time purchase through StoreKit 2'
  s.description    = 'One-time purchase through StoreKit 2'
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
  s.frameworks     = 'StoreKit'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
