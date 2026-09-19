export const SUPPORTED_LOCALES = ["ko", "ja", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "ko";
export const LOCALE_COOKIE = "apex-locale";

export function normalizeLocale(value: string | null | undefined): AppLocale {
  const normalized = value?.toLowerCase().split("-")[0];
  return SUPPORTED_LOCALES.includes(normalized as AppLocale)
    ? (normalized as AppLocale)
    : DEFAULT_LOCALE;
}

export function localeFromPathname(pathname: string): AppLocale {
  return normalizeLocale(pathname.split("/")[1]);
}

export function stripLocaleFromPathname(pathname: string) {
  const segments = pathname.split("/");
  if (SUPPORTED_LOCALES.includes(segments[1] as AppLocale)) {
    const stripped = "/" + segments.slice(2).join("/");
    return stripped === "/" ? "/" : stripped.replace(/\/$/, "");
  }
  return pathname || "/";
}

export function localizeHref(href: string, locale: AppLocale) {
  if (!href.startsWith("/") || href.startsWith("/api/") || href.startsWith("/auth/")) {
    return href;
  }

  const [pathname, suffix = ""] = href.split(/(?=[?#])/u, 2);
  const stripped = stripLocaleFromPathname(pathname);
  return `/${locale}${stripped === "/" ? "" : stripped}${suffix}`;
}

type CommonMessages = {
  localeName: string;
  nav: {
    home: string;
    mining: string;
    assets: string;
    activity: string;
    more: string;
    notifications: string;
    deposit: string;
    withdrawal: string;
    profile: string;
    security: string;
  };
  shell: {
    subtitle: string;
    workspace: string;
    workspaceTitle: string;
    protectedAccount: string;
    protectedDescription: string;
    logout: string;
    notification: string;
    quickMenu: string;
    user: string;
    navigation: string;
    unreadNotifications: (count: number) => string;
    themeToggle: string;
  };
  more: {
    eyebrow: string;
    title: string;
    description: string;
    finance: string;
    account: string;
    preferences: string;
    language: string;
    theme: string;
  };
  mining: {
    live: string;
    title: string;
    description: string;
    activeContracts: string;
    availableProducts: string;
    serverVerified: string;
  };
};

export const commonMessages: Record<AppLocale, CommonMessages> = {
  ko: {
    localeName: "한국어",
    nav: {
      home: "홈",
      mining: "채굴",
      assets: "자산",
      activity: "활동",
      more: "더보기",
      notifications: "알림",
      deposit: "입금",
      withdrawal: "출금",
      profile: "내 정보",
      security: "보안"
    },
    shell: {
      subtitle: "글로벌 채굴 자산 플랫폼",
      workspace: "내 계정",
      workspaceTitle: "자산 운영공간",
      protectedAccount: "계정 보호 중",
      protectedDescription: "금융·채굴 데이터는 로그인한 본인 계정 범위에서만 조회됩니다.",
      logout: "로그아웃",
      notification: "알림",
      quickMenu: "빠른 메뉴",
      user: "사용자",
      navigation: "사용자 메뉴",
      unreadNotifications: (count) => `읽지 않은 알림 ${count}개`,
      themeToggle: "밝은 모드와 어두운 모드 전환"
    },
    more: {
      eyebrow: "계정 및 설정",
      title: "더보기",
      description: "금융 요청, 알림, 내 정보, 보안과 언어 설정을 한 곳에서 관리합니다.",
      finance: "금융 업무",
      account: "계정 관리",
      preferences: "환경 설정",
      language: "언어",
      theme: "화면 모드"
    },
    mining: {
      live: "채굴 엔진 연결됨",
      title: "나의 채굴 코어",
      description: "화면의 움직임과 관계없이 보상과 잔액은 서버 원장 기준으로 안전하게 기록됩니다.",
      activeContracts: "진행 중 계약",
      availableProducts: "이용 가능 상품",
      serverVerified: "서버 검증"
    }
  },
  ja: {
    localeName: "日本語",
    nav: {
      home: "ホーム",
      mining: "マイニング",
      assets: "資産",
      activity: "履歴",
      more: "その他",
      notifications: "お知らせ",
      deposit: "入金",
      withdrawal: "出金",
      profile: "プロフィール",
      security: "セキュリティ"
    },
    shell: {
      subtitle: "グローバル採掘資産プラットフォーム",
      workspace: "マイアカウント",
      workspaceTitle: "資産管理スペース",
      protectedAccount: "アカウント保護中",
      protectedDescription: "金融・マイニングデータは、ログイン中のご本人のみ確認できます。",
      logout: "ログアウト",
      notification: "お知らせ",
      quickMenu: "クイックメニュー",
      user: "ユーザー",
      navigation: "ユーザーメニュー",
      unreadNotifications: (count) => `未読のお知らせ ${count}件`,
      themeToggle: "ライトモードとダークモードを切り替え"
    },
    more: {
      eyebrow: "アカウントと設定",
      title: "その他",
      description: "入出金、お知らせ、プロフィール、セキュリティと言語設定を管理できます。",
      finance: "入出金",
      account: "アカウント管理",
      preferences: "表示設定",
      language: "言語",
      theme: "表示モード"
    },
    mining: {
      live: "マイニングエンジン接続済み",
      title: "マイニングコア",
      description: "画面演出とは別に、報酬と残高はサーバー台帳へ安全に記録されます。",
      activeContracts: "進行中の契約",
      availableProducts: "利用可能な商品",
      serverVerified: "サーバー検証"
    }
  },
  en: {
    localeName: "English",
    nav: {
      home: "Home",
      mining: "Mining",
      assets: "Assets",
      activity: "Activity",
      more: "More",
      notifications: "Notifications",
      deposit: "Deposit",
      withdrawal: "Withdraw",
      profile: "Profile",
      security: "Security"
    },
    shell: {
      subtitle: "Global mining asset platform",
      workspace: "My account",
      workspaceTitle: "Asset workspace",
      protectedAccount: "Account protected",
      protectedDescription: "Financial and mining data is limited to your signed-in account.",
      logout: "Sign out",
      notification: "Notifications",
      quickMenu: "Quick navigation",
      user: "User",
      navigation: "User menu",
      unreadNotifications: (count) => `${count} unread notifications`,
      themeToggle: "Switch between light and dark mode"
    },
    more: {
      eyebrow: "Account & settings",
      title: "More",
      description: "Manage money requests, notifications, profile, security, and language settings.",
      finance: "Money operations",
      account: "Account",
      preferences: "Preferences",
      language: "Language",
      theme: "Appearance"
    },
    mining: {
      live: "Mining engine connected",
      title: "Your mining core",
      description: "Rewards and balances are recorded by the server ledger, independently of visual effects.",
      activeContracts: "Active contracts",
      availableProducts: "Available products",
      serverVerified: "Server verified"
    }
  }
};

type AuthMessages = {
  center: string;
  heroLine: string;
  heroHighlight: string;
  heroDescription: string;
  features: Array<{ title: string; description: string }>;
  secureAccess: string;
  signInTitle: string;
  signInDescription: string;
  immutableNotice: string;
  displayName: string;
  displayNamePlaceholder: string;
  email: string;
  password: string;
  passwordPlaceholderSignup: string;
  passwordPlaceholderLogin: string;
  passwordPolicy: string;
  passwordPolicyLabel: string;
  passwordRules: string[];
  strongPasswordError: string;
  signupComplete: string;
  authFailed: string;
  loading: string;
  signupButton: string;
  loginButton: string;
  existingAccount: string;
  newAccount: string;
};

export const authMessages: Record<AppLocale, AuthMessages> = {
  ko: {
    center: "사용자 운영센터",
    heroLine: "자산과 채굴을",
    heroHighlight: "한 곳에서.",
    heroDescription: "인증 계정 하나로 자산, 입출금, 채굴 현황과 금융 활동 기록을 깔끔하게 관리하세요.",
    features: [
      { title: "원장 기반 기록", description: "금융 거래는 변경할 수 없는 원장 기록을 기준으로 확인" },
      { title: "자동 채굴 기록", description: "계산·지급 이력을 시간순으로 안전하게 보존" },
      { title: "명확한 처리 상태", description: "입출금 요청의 현재 상태와 다음 행동을 안내" },
      { title: "계정 보안", description: "본인 계정 범위에서만 금융·채굴 데이터 조회" }
    ],
    secureAccess: "안전한 접속",
    signInTitle: "회원 로그인",
    signInDescription: "이메일 인증이 완료된 계정으로 APEX-MATRIX를 이용할 수 있습니다.",
    immutableNotice: "금융 잔액과 채굴 보상은 사용자 화면에서 직접 수정할 수 없습니다.",
    displayName: "표시 이름",
    displayNamePlaceholder: "서비스에서 사용할 이름",
    email: "이메일",
    password: "비밀번호",
    passwordPlaceholderSignup: "12자 이상",
    passwordPlaceholderLogin: "비밀번호 입력",
    passwordPolicy: "가입 비밀번호는 12자 이상이며 대문자·소문자·숫자·특수문자를 각각 포함해야 합니다.",
    passwordPolicyLabel: "비밀번호 기준",
    passwordRules: ["12자 이상", "영문 대문자 포함", "영문 소문자 포함", "숫자 포함", "특수문자 포함"],
    strongPasswordError: "비밀번호는 12자 이상이며 영문 대문자·소문자·숫자·특수문자를 각각 1개 이상 포함해야 합니다.",
    signupComplete: "가입이 완료되었습니다. 받은 이메일에서 인증을 완료하면 로그인할 수 있습니다.",
    authFailed: "인증 처리에 실패했습니다.",
    loading: "처리 중...",
    signupButton: "회원가입하고 시작하기",
    loginButton: "안전하게 로그인",
    existingAccount: "기존 계정으로 로그인",
    newAccount: "새 계정 만들기"
  },
  ja: {
    center: "ユーザーセンター",
    heroLine: "資産とマイニングを",
    heroHighlight: "ひとつの場所で。",
    heroDescription: "ひとつの認証アカウントで、資産、入出金、マイニング状況と取引履歴を分かりやすく管理できます。",
    features: [
      { title: "台帳ベースの記録", description: "金融取引は変更できない台帳記録を基準に確認" },
      { title: "自動マイニング記録", description: "計算と支払いの履歴を時系列で安全に保存" },
      { title: "明確な処理状況", description: "入出金申請の現在状況と次の操作をご案内" },
      { title: "アカウント保護", description: "ご本人のアカウント範囲でのみデータを表示" }
    ],
    secureAccess: "安全なアクセス",
    signInTitle: "ログイン",
    signInDescription: "メール認証が完了したアカウントでAPEX-MATRIXをご利用いただけます。",
    immutableNotice: "残高とマイニング報酬をユーザー画面から直接変更することはできません。",
    displayName: "表示名",
    displayNamePlaceholder: "サービスで使用する名前",
    email: "メールアドレス",
    password: "パスワード",
    passwordPlaceholderSignup: "12文字以上",
    passwordPlaceholderLogin: "パスワードを入力",
    passwordPolicy: "12文字以上で、大文字・小文字・数字・記号をそれぞれ1文字以上含めてください。",
    passwordPolicyLabel: "パスワードの条件",
    passwordRules: ["12文字以上", "英大文字", "英小文字", "数字", "記号"],
    strongPasswordError: "12文字以上で、大文字・小文字・数字・記号をそれぞれ1文字以上含めてください。",
    signupComplete: "登録が完了しました。受信したメールから認証を完了するとログインできます。",
    authFailed: "認証処理に失敗しました。",
    loading: "処理中...",
    signupButton: "アカウントを作成",
    loginButton: "安全にログイン",
    existingAccount: "既存アカウントでログイン",
    newAccount: "新規アカウント作成"
  },
  en: {
    center: "User center",
    heroLine: "Your assets and mining,",
    heroHighlight: "all in one place.",
    heroDescription: "Use one verified account to manage assets, money requests, mining status, and activity records.",
    features: [
      { title: "Ledger-based records", description: "Financial activity is verified against immutable ledger records" },
      { title: "Automated mining history", description: "Calculation and payment events remain available in time order" },
      { title: "Clear processing status", description: "See the current state and next action for each money request" },
      { title: "Account security", description: "Financial and mining data stays within your signed-in account" }
    ],
    secureAccess: "Secure access",
    signInTitle: "Sign in",
    signInDescription: "Use an email-verified account to access APEX-MATRIX.",
    immutableNotice: "Balances and mining rewards cannot be edited directly from the user interface.",
    displayName: "Display name",
    displayNamePlaceholder: "Name shown in the service",
    email: "Email",
    password: "Password",
    passwordPlaceholderSignup: "At least 12 characters",
    passwordPlaceholderLogin: "Enter your password",
    passwordPolicy: "Use at least 12 characters with uppercase, lowercase, number, and symbol.",
    passwordPolicyLabel: "Password requirements",
    passwordRules: ["12+ characters", "Uppercase letter", "Lowercase letter", "Number", "Symbol"],
    strongPasswordError: "Use at least 12 characters with uppercase, lowercase, number, and symbol.",
    signupComplete: "Your account was created. Verify the email we sent before signing in.",
    authFailed: "Authentication failed.",
    loading: "Processing...",
    signupButton: "Create account",
    loginButton: "Sign in securely",
    existingAccount: "Sign in to an existing account",
    newAccount: "Create a new account"
  }
};

export const localeFormats: Record<
  AppLocale,
  { intlLocale: string; timeZone: string }
> = {
  ko: { intlLocale: "ko-KR", timeZone: "Asia/Seoul" },
  ja: { intlLocale: "ja-JP", timeZone: "Asia/Tokyo" },
  en: { intlLocale: "en-US", timeZone: "UTC" }
};

type DashboardMessages = {
  userFallback: string;
  welcome: (name: string) => string;
  description: string;
  verified: string;
  email: string;
  username: string;
  accountStatus: string;
  notRegistered: string;
  notSet: string;
  checking: string;
  currentAssets: string;
  currentAssetsDescription: string;
  viewAll: string;
  precision: (decimals: number) => string;
  noAssets: string;
  miningStatus: string;
  miningStatusDescription: string;
  miningCenter: string;
  miningProduct: string;
  miningActive: string;
  totalMined: string;
  totalPaid: string;
  pendingReward: string;
  noActiveContract: string;
  noActiveContractDescription: string;
  quickActions: string;
  quickActionsDescription: string;
  deposit: string;
  depositDescription: string;
  withdrawal: string;
  withdrawalDescription: string;
  activity: string;
  activityDescription: string;
  availableActivity: string;
  activeContracts: string;
  automaticCalculationTarget: string;
  protectionStatus: string;
  verifiedAccount: string;
  ownAccountOnly: string;
  recentActivity: string;
  recentActivityDescription: string;
  allRecords: string;
  financialTransaction: string;
  asset: string;
  noActivity: string;
  noActivityDescription: string;
};

export const dashboardMessages: Record<AppLocale, DashboardMessages> = {
  ko: {
    userFallback: "회원", welcome: (name) => `${name}님, 환영합니다.`,
    description: "오늘의 자산 상태와 채굴 활동을 한눈에 확인하고 필요한 금융 업무를 빠르게 시작하세요.",
    verified: "계정 인증 완료", email: "이메일", username: "아이디", accountStatus: "계정 상태",
    notRegistered: "미등록", notSet: "미설정", checking: "확인 중",
    currentAssets: "현재 자산", currentAssetsDescription: "원장 기준으로 확인되는 내 자산 잔액", viewAll: "전체 보기",
    precision: (decimals) => `소수점 ${decimals}자리`, noAssets: "현재 활성화된 자산이 없습니다.",
    miningStatus: "채굴 현황", miningStatusDescription: "자동 계산 대상 계약과 최근 상태", miningCenter: "채굴센터",
    miningProduct: "채굴 상품", miningActive: "채굴 중", totalMined: "누적 채굴량", totalPaid: "누적 지급량", pendingReward: "미지급 잔여",
    noActiveContract: "현재 활성 채굴 계약이 없습니다.", noActiveContractDescription: "채굴 상품을 시작하면 이곳에서 진행 상태를 확인할 수 있습니다.",
    quickActions: "빠른 업무", quickActionsDescription: "자주 사용하는 사용자 기능", deposit: "입금 요청", depositDescription: "입금 사실을 운영자에게 전달",
    withdrawal: "출금 요청", withdrawalDescription: "보유 자산의 출금을 신청", activity: "활동 기록", activityDescription: "최근 금융 거래를 확인",
    availableActivity: "현재 조회 가능한 금융 활동", activeContracts: "활성 계약", automaticCalculationTarget: "현재 자동 계산 대상",
    protectionStatus: "보호 상태", verifiedAccount: "인증 계정", ownAccountOnly: "본인 계정 범위에서 데이터 조회",
    recentActivity: "최근 금융 활동", recentActivityDescription: "원장에 기록된 최신 항목", allRecords: "전체 기록",
    financialTransaction: "금융 거래", asset: "자산", noActivity: "아직 금융 활동 기록이 없습니다.", noActivityDescription: "입금·출금·채굴 지급이 처리되면 이곳에 나타납니다."
  },
  ja: {
    userFallback: "会員", welcome: (name) => `${name}さん、ようこそ。`,
    description: "本日の資産とマイニング状況を確認し、必要な手続きをすぐに始められます。",
    verified: "アカウント確認済み", email: "メール", username: "ユーザーID", accountStatus: "アカウント状態",
    notRegistered: "未登録", notSet: "未設定", checking: "確認中",
    currentAssets: "現在の資産", currentAssetsDescription: "台帳に記録された残高", viewAll: "すべて表示",
    precision: (decimals) => `小数点以下${decimals}桁`, noAssets: "現在利用可能な資産はありません。",
    miningStatus: "マイニング状況", miningStatusDescription: "自動計算中の契約と最新状態", miningCenter: "マイニング",
    miningProduct: "マイニング商品", miningActive: "稼働中", totalMined: "累計報酬", totalPaid: "累計支払", pendingReward: "未払残高",
    noActiveContract: "稼働中のマイニング契約はありません。", noActiveContractDescription: "商品を開始すると進行状況がここに表示されます。",
    quickActions: "クイック操作", quickActionsDescription: "よく使う機能", deposit: "入金申請", depositDescription: "入金内容を運営へ連絡",
    withdrawal: "出金申請", withdrawalDescription: "保有資産の出金を申請", activity: "取引履歴", activityDescription: "最近の金融取引を確認",
    availableActivity: "確認可能な金融履歴", activeContracts: "稼働契約", automaticCalculationTarget: "自動計算の対象",
    protectionStatus: "保護状態", verifiedAccount: "確認済みアカウント", ownAccountOnly: "本人のデータのみ表示",
    recentActivity: "最近の金融履歴", recentActivityDescription: "台帳に記録された最新項目", allRecords: "すべての履歴",
    financialTransaction: "金融取引", asset: "資産", noActivity: "金融履歴はまだありません。", noActivityDescription: "入出金やマイニング報酬が処理されると表示されます。"
  },
  en: {
    userFallback: "Member", welcome: (name) => `Welcome, ${name}.`,
    description: "Review today’s assets and mining activity, then start the action you need.",
    verified: "Account verified", email: "Email", username: "Username", accountStatus: "Account status",
    notRegistered: "Not registered", notSet: "Not set", checking: "Checking",
    currentAssets: "Current assets", currentAssetsDescription: "Balances recorded in your ledger", viewAll: "View all",
    precision: (decimals) => `${decimals} decimal places`, noAssets: "No active assets are available.",
    miningStatus: "Mining status", miningStatusDescription: "Contracts in automatic calculation and recent status", miningCenter: "Mining center",
    miningProduct: "Mining product", miningActive: "Mining", totalMined: "Total mined", totalPaid: "Total paid", pendingReward: "Pending reward",
    noActiveContract: "You have no active mining contracts.", noActiveContractDescription: "Start a product to see its progress here.",
    quickActions: "Quick actions", quickActionsDescription: "Frequently used account features", deposit: "Deposit request", depositDescription: "Report a deposit to operations",
    withdrawal: "Withdrawal request", withdrawalDescription: "Request a withdrawal from your assets", activity: "Activity", activityDescription: "Review recent financial activity",
    availableActivity: "Financial records currently available", activeContracts: "Active contracts", automaticCalculationTarget: "Currently calculated automatically",
    protectionStatus: "Protection", verifiedAccount: "Verified account", ownAccountOnly: "Data is limited to your account",
    recentActivity: "Recent financial activity", recentActivityDescription: "Latest ledger records", allRecords: "All records",
    financialTransaction: "Financial transaction", asset: "Asset", noActivity: "No financial activity yet.", noActivityDescription: "Deposits, withdrawals, and mining payments will appear here after processing."
  }
};

export const assetsMessages: Record<AppLocale, {
  eyebrow: string; title: string; description: string; loadError: string;
  fiat: string; digital: string; noAssets: string; precision: (decimals: number) => string;
}> = {
  ko: { eyebrow: "Assets", title: "내 자산", description: "현재 계정에 귀속된 자산과 원장 기준 잔액을 한눈에 확인합니다.", loadError: "자산 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", fiat: "원화", digital: "디지털 자산", noAssets: "현재 활성화된 자산이 없습니다.", precision: (decimals) => `소수점 ${decimals}자리` },
  ja: { eyebrow: "Assets", title: "保有資産", description: "アカウントに記録された資産と台帳残高を確認できます。", loadError: "資産情報を読み込めませんでした。しばらくしてからお試しください。", fiat: "法定通貨", digital: "デジタル資産", noAssets: "現在利用可能な資産はありません。", precision: (decimals) => `小数点以下${decimals}桁` },
  en: { eyebrow: "Assets", title: "Your assets", description: "Review the assets and ledger balances assigned to your account.", loadError: "We could not load your assets. Please try again shortly.", fiat: "Fiat", digital: "Digital asset", noAssets: "No active assets are available.", precision: (decimals) => `${decimals} decimal places` }
};

export const historyMessages: Record<AppLocale, {
  eyebrow: string; title: string; description: string; loadError: string;
  transaction: string; asset: string; change: string; processedAt: string;
  financialTransaction: string; ledgerTransaction: string; processedAtPending: string; empty: string;
  types: Record<string, string>; statuses: Record<string, string>;
}> = {
  ko: { eyebrow: "History", title: "금융 활동 기록", description: "내 계정에서 발생한 원장 거래를 최신순으로 확인합니다. 원본 기록은 삭제하지 않고 정정 거래로 남깁니다.", loadError: "금융 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", transaction: "거래", asset: "자산", change: "변동", processedAt: "처리일시", financialTransaction: "금융 거래", ledgerTransaction: "금융 원장 거래", processedAtPending: "처리일시 확인 중", empty: "아직 기록된 금융 거래가 없습니다.", types: { deposit: "입금", withdrawal: "출금", mining_reward: "채굴 보상", settlement: "정산", adjustment: "수동 조정", reversal: "정정 거래" }, statuses: { posted: "처리 완료", reversed: "정정됨", reversal: "정정 거래" } },
  ja: { eyebrow: "History", title: "金融取引履歴", description: "アカウントの台帳取引を新しい順に表示します。元の記録は削除せず、訂正取引として保存します。", loadError: "金融履歴を読み込めませんでした。しばらくしてからお試しください。", transaction: "取引", asset: "資産", change: "増減", processedAt: "処理日時", financialTransaction: "金融取引", ledgerTransaction: "台帳取引", processedAtPending: "処理日時を確認中", empty: "金融取引履歴はまだありません。", types: { deposit: "入金", withdrawal: "出金", mining_reward: "マイニング報酬", settlement: "精算", adjustment: "手動調整", reversal: "訂正取引" }, statuses: { posted: "処理完了", reversed: "訂正済み", reversal: "訂正取引" } },
  en: { eyebrow: "History", title: "Financial activity", description: "Review your ledger transactions in reverse chronological order. Original records remain intact and corrections are recorded separately.", loadError: "We could not load your financial history. Please try again shortly.", transaction: "Transaction", asset: "Asset", change: "Change", processedAt: "Processed", financialTransaction: "Financial transaction", ledgerTransaction: "Ledger transaction", processedAtPending: "Processing time pending", empty: "No financial transactions have been recorded yet.", types: { deposit: "Deposit", withdrawal: "Withdrawal", mining_reward: "Mining reward", settlement: "Settlement", adjustment: "Manual adjustment", reversal: "Correction" }, statuses: { posted: "Completed", reversed: "Corrected", reversal: "Correction" } }
};

type MiningPageMessages = {
  title: string; description: string; loadError: string;
  tabs: { overview: string; rewards: string; payments: string };
  started: string; errors: Record<string, string>;
  startEyebrow: string; startTitle: string; startDescription: string; safeStart: string;
  noProducts: string; product: string; rewardAsset: string; period: (days: string) => string;
  categories: Record<string, string>; riskNotice: string;
  available: string; dailyReward: string; capacityRange: string; minimum: string;
  capacityLabel: string; capacityPlaceholder: string; capacityUnit: string; startNotice: string; startButton: string;
  contracts: string; contractsDescription: string; contractCount: (count: number) => string; noContracts: string;
  status: Record<string, string>; capacity: string; totalMined: string; totalPaid: string; pending: string;
  version: (version: string) => string; contractPeriod: (start: string, end: string) => string;
  lastCalculation: (date: string) => string; createdAt: (date: string) => string;
  rewardsTitle: string; rewardsDescription: string; calculationPeriod: string; elapsed: string; reward: string; recordedAt: string;
  seconds: (value: string) => string; noRewards: string; correctionsTitle: string; correctionsDescription: string;
  correction: string; correctionAmount: string; paymentApplied: string; pendingAdjusted: string; originalRecord: string;
  separateCorrection: string; correctionReason: string; noCorrections: string;
  paymentsTitle: string; paymentsDescription: string; paidAt: string; contract: string; paidAmount: string; recordId: string; noPayments: string;
  cancellationsTitle: string; cancellationsDescription: string; cancellation: string; paidUntilCancel: string;
  remainingPending: string; calculationEnded: string; reason: string; noCancellations: string;
};

export const miningPageMessages: Record<AppLocale, MiningPageMessages> = {
  ko: {
    title: "채굴 현황", description: "채굴 상품과 계약 상태를 확인하고 계산·지급·정정 기록을 필요할 때 조회합니다.", loadError: "채굴 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    tabs: { overview: "상품·계약", rewards: "계산·정정", payments: "지급·종료" },
    started: "채굴이 시작되었습니다. 계약 상태와 보상 내역을 이 화면에서 확인할 수 있습니다.",
    errors: { invalid: "입력 내용을 확인한 뒤 다시 시도해 주세요.", capacity: "입력한 용량이 상품의 허용 범위를 벗어났습니다.", unavailable: "현재 시작할 수 없는 상품입니다.", failed: "채굴 시작을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." },
    startEyebrow: "내 채굴 시작", startTitle: "채굴 상품을 선택하세요", startDescription: "상품과 용량을 선택하면 공개 상태와 허용 범위를 서버가 다시 확인한 뒤 계약을 시작합니다.", safeStart: "서버 확인 후 시작",
    noProducts: "현재 신청할 수 있는 공개 채굴 상품이 없습니다.", product: "채굴 상품", rewardAsset: "보상 자산", period: (days) => `기간 ${days}일`, categories: { stock: "주식", crypto: "코인", gold: "금", silver: "은" }, riskNotice: "상품 안내", available: "이용 가능", dailyReward: "단위당 하루 보상", capacityRange: "채굴 용량 범위", minimum: "최소", capacityLabel: "시작할 채굴 용량", capacityPlaceholder: "용량 입력", capacityUnit: "단위", startNotice: "시작 후 보상과 잔액은 자동 계산 정책과 원장 기록을 기준으로 처리됩니다.", startButton: "이 상품으로 채굴 시작",
    contracts: "내 채굴 계약", contractsDescription: "계약을 시작한 시점의 상품 버전이 계산 기준으로 고정됩니다.", contractCount: (count) => `${count}개`, noContracts: "아직 채굴 계약이 없습니다.", status: { active: "채굴 중", completed: "기간 완료", cancelled: "취소" }, capacity: "채굴 용량", totalMined: "누적 채굴량", totalPaid: "누적 지급량", pending: "현재 미지급 잔여량", version: (version) => `버전 v${version}`, contractPeriod: (start, end) => `기간 ${start} ~ ${end}`, lastCalculation: (date) => `최근 계산 ${date}`, createdAt: (date) => `계약 생성 ${date}`,
    rewardsTitle: "채굴 계산 기록", rewardsDescription: "자동 계산된 시간 구간과 보상량을 확인합니다.", calculationPeriod: "계산 구간", elapsed: "경과", reward: "계산 보상", recordedAt: "기록 시각", seconds: (value) => `${value}초`, noRewards: "아직 채굴 계산 기록이 없습니다.", correctionsTitle: "보상 정정 내역", correctionsDescription: "원본 기록은 유지하고 별도 정정 기록으로 반영합니다.", correction: "보상 정정", correctionAmount: "정정 수량", paymentApplied: "지급 반영", pendingAdjusted: "잔여량 조정", originalRecord: "원 계산 기록", separateCorrection: "별도 계산 정정", correctionReason: "정정 사유", noCorrections: "보상 정정 내역이 없습니다.",
    paymentsTitle: "보상 지급 기록", paymentsDescription: "지급된 보상은 자산 기록과 연결되어 잔액에 반영됩니다.", paidAt: "지급 시각", contract: "상품 계약", paidAmount: "지급량", recordId: "자산 기록", noPayments: "아직 지급된 채굴 보상이 없습니다.", cancellationsTitle: "계약 종료 기록", cancellationsDescription: "취소 시각까지 계산된 지급량과 잔여량, 종료 사유를 확인합니다.", cancellation: "채굴 계약 종료", paidUntilCancel: "종료 시각까지 지급", remainingPending: "남은 미지급", calculationEnded: "계산 종료 시각", reason: "종료 사유", noCancellations: "계약 종료 기록이 없습니다."
  },
  ja: {
    title: "マイニング状況", description: "商品と契約を確認し、必要なときだけ計算・支払・訂正履歴を読み込みます。", loadError: "マイニングデータを読み込めませんでした。しばらくしてからお試しください。",
    tabs: { overview: "商品・契約", rewards: "計算・訂正", payments: "支払・終了" },
    started: "マイニングを開始しました。契約状況と報酬履歴をこの画面で確認できます。",
    errors: { invalid: "入力内容を確認してもう一度お試しください。", capacity: "入力した容量が商品の許容範囲外です。", unavailable: "現在開始できない商品です。", failed: "マイニングを開始できませんでした。しばらくしてからお試しください。" },
    startEyebrow: "マイニング開始", startTitle: "商品を選択してください", startDescription: "商品と容量を選択すると、公開状態と許容範囲をサーバーで再確認してから契約を開始します。", safeStart: "サーバー確認後に開始",
    noProducts: "現在申し込める公開商品はありません。", product: "マイニング商品", rewardAsset: "報酬資産", period: (days) => `期間 ${days}日`, categories: { stock: "株式", crypto: "暗号資産", gold: "金", silver: "銀" }, riskNotice: "商品に関するご案内", available: "利用可能", dailyReward: "単位あたり1日報酬", capacityRange: "容量範囲", minimum: "最小", capacityLabel: "開始容量", capacityPlaceholder: "容量を入力", capacityUnit: "単位", startNotice: "開始後の報酬と残高は自動計算ポリシーと台帳記録に基づいて処理されます。", startButton: "この商品で開始",
    contracts: "マイニング契約", contractsDescription: "開始時の商品バージョンが計算基準として固定されます。", contractCount: (count) => `${count}件`, noContracts: "マイニング契約はまだありません。", status: { active: "稼働中", completed: "期間終了", cancelled: "取消" }, capacity: "容量", totalMined: "累計報酬", totalPaid: "累計支払", pending: "未払残高", version: (version) => `バージョン v${version}`, contractPeriod: (start, end) => `期間 ${start} ～ ${end}`, lastCalculation: (date) => `最終計算 ${date}`, createdAt: (date) => `契約作成 ${date}`,
    rewardsTitle: "計算履歴", rewardsDescription: "自動計算された期間と報酬を確認できます。", calculationPeriod: "計算期間", elapsed: "経過", reward: "計算報酬", recordedAt: "記録日時", seconds: (value) => `${value}秒`, noRewards: "計算履歴はまだありません。", correctionsTitle: "報酬訂正", correctionsDescription: "元の記録を保持し、別の訂正記録として反映します。", correction: "報酬訂正", correctionAmount: "訂正数量", paymentApplied: "支払反映", pendingAdjusted: "残高調整", originalRecord: "元の計算記録", separateCorrection: "個別訂正", correctionReason: "訂正理由", noCorrections: "訂正履歴はありません。",
    paymentsTitle: "報酬支払履歴", paymentsDescription: "支払済み報酬は資産記録と連携して残高に反映されます。", paidAt: "支払日時", contract: "商品契約", paidAmount: "支払数量", recordId: "資産記録", noPayments: "支払済み報酬はまだありません。", cancellationsTitle: "契約終了履歴", cancellationsDescription: "終了時点までの支払額、残高、終了理由を確認できます。", cancellation: "マイニング契約終了", paidUntilCancel: "終了までの支払", remainingPending: "未払残高", calculationEnded: "計算終了日時", reason: "終了理由", noCancellations: "契約終了履歴はありません。"
  },
  en: {
    title: "Mining status", description: "Review products and contracts, then load calculation, payment, or correction records only when needed.", loadError: "We could not load mining data. Please try again shortly.",
    tabs: { overview: "Products & contracts", rewards: "Calculations & corrections", payments: "Payments & closures" },
    started: "Mining started. You can review contract status and rewards on this page.",
    errors: { invalid: "Check your input and try again.", capacity: "The entered capacity is outside this product’s allowed range.", unavailable: "This product cannot be started right now.", failed: "We could not start mining. Please try again shortly." },
    startEyebrow: "Start mining", startTitle: "Choose a mining product", startDescription: "Choose a product and capacity. The server rechecks availability and limits before creating the contract.", safeStart: "Server-verified start",
    noProducts: "No public mining products are available right now.", product: "Mining product", rewardAsset: "Reward asset", period: (days) => `${days} days`, categories: { stock: "Stocks", crypto: "Crypto", gold: "Gold", silver: "Silver" }, riskNotice: "Product notice", available: "Available", dailyReward: "Daily reward per unit", capacityRange: "Capacity range", minimum: "Minimum", capacityLabel: "Starting capacity", capacityPlaceholder: "Enter capacity", capacityUnit: "Unit", startNotice: "Rewards and balances follow the automatic calculation policy and ledger records after the contract starts.", startButton: "Start this product",
    contracts: "Your mining contracts", contractsDescription: "The product version at contract creation remains the calculation basis.", contractCount: (count) => `${count}`, noContracts: "You have no mining contracts yet.", status: { active: "Mining", completed: "Completed", cancelled: "Cancelled" }, capacity: "Capacity", totalMined: "Total mined", totalPaid: "Total paid", pending: "Pending reward", version: (version) => `Version v${version}`, contractPeriod: (start, end) => `Period ${start} – ${end}`, lastCalculation: (date) => `Last calculation ${date}`, createdAt: (date) => `Created ${date}`,
    rewardsTitle: "Calculation history", rewardsDescription: "Review automatically calculated periods and reward amounts.", calculationPeriod: "Calculation period", elapsed: "Elapsed", reward: "Calculated reward", recordedAt: "Recorded", seconds: (value) => `${value}s`, noRewards: "No calculation history yet.", correctionsTitle: "Reward corrections", correctionsDescription: "Original records remain intact and adjustments are recorded separately.", correction: "Reward correction", correctionAmount: "Correction amount", paymentApplied: "Payment applied", pendingAdjusted: "Pending adjusted", originalRecord: "Original calculation", separateCorrection: "Separate correction", correctionReason: "Reason", noCorrections: "No reward corrections.",
    paymentsTitle: "Reward payments", paymentsDescription: "Paid rewards are linked to asset records and reflected in your balance.", paidAt: "Paid", contract: "Product contract", paidAmount: "Amount", recordId: "Asset record", noPayments: "No mining rewards have been paid yet.", cancellationsTitle: "Contract closures", cancellationsDescription: "Review payments through closure, remaining rewards, and the closure reason.", cancellation: "Mining contract closed", paidUntilCancel: "Paid through closure", remainingPending: "Remaining pending", calculationEnded: "Calculation ended", reason: "Closure reason", noCancellations: "No contract closure records."
  }
};
