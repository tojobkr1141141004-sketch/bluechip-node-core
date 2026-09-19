-- PHASE 26: safe, non-public catalog shells for the four launch categories.
-- Rates and versions are intentionally omitted until operating policy is approved.

insert into public.mining_products (
  code,
  name,
  description,
  category,
  status,
  is_public,
  sort_order
)
values
  ('APEX_STOCK_MINE', '주식 마인', '주식 테마 채굴 상품 초안', 'stock', 'draft', false, 100),
  ('APEX_CRYPTO_HASH', '크립토 해시', '디지털 자산 테마 채굴 상품 초안', 'crypto', 'draft', false, 200),
  ('APEX_GOLD_VAULT', '골드 볼트', '금 테마 채굴 상품 초안', 'gold', 'draft', false, 300),
  ('APEX_SILVER_VAULT', '실버 볼트', '은 테마 채굴 상품 초안', 'silver', 'draft', false, 400)
on conflict (code) do nothing;

insert into public.mining_product_localizations (
  product_id,
  locale,
  name,
  description,
  risk_notice
)
select
  mp.id,
  content.locale,
  content.name,
  content.description,
  content.risk_notice
from public.mining_products mp
join (
  values
    ('APEX_STOCK_MINE', 'ko', '주식 마인', '주식 테마를 채굴 장비 운영처럼 직관적으로 경험하도록 설계된 상품입니다.', '보상률과 운영 기간은 발행된 상품 버전을 따릅니다. 현재 초안은 신청할 수 없습니다.'),
    ('APEX_STOCK_MINE', 'ja', 'ストック・マイン', '株式テーマをマイニング設備の運用のように直感的に体験できるよう設計された商品です。', '報酬率と運用期間は公開済みの商品バージョンに従います。現在の下書きはお申し込みいただけません。'),
    ('APEX_STOCK_MINE', 'en', 'Stock Mine', 'A stock-themed product designed to feel as clear and tangible as operating mining equipment.', 'Rates and operating terms follow the published product version. This draft is not available to start.'),
    ('APEX_CRYPTO_HASH', 'ko', '크립토 해시', '디지털 자산 테마의 채굴 진행과 누적 보상을 직관적으로 확인하는 상품입니다.', '보상률과 운영 기간은 발행된 상품 버전을 따릅니다. 현재 초안은 신청할 수 없습니다.'),
    ('APEX_CRYPTO_HASH', 'ja', 'クリプト・ハッシュ', '暗号資産テーマのマイニング進行状況と累計報酬を分かりやすく確認できる商品です。', '報酬率と運用期間は公開済みの商品バージョンに従います。現在の下書きはお申し込みいただけません。'),
    ('APEX_CRYPTO_HASH', 'en', 'Crypto Hash', 'A crypto-themed product with clear mining progress and accumulated reward records.', 'Rates and operating terms follow the published product version. This draft is not available to start.'),
    ('APEX_GOLD_VAULT', 'ko', '골드 볼트', '금 테마의 채굴 코어와 보상 기록을 안정적인 금고 경험으로 표현한 상품입니다.', '보상률과 운영 기간은 발행된 상품 버전을 따릅니다. 현재 초안은 신청할 수 없습니다.'),
    ('APEX_GOLD_VAULT', 'ja', 'ゴールド・ボルト', '金テーマのマイニングコアと報酬記録を、安定感のある保管庫体験として表現した商品です。', '報酬率と運用期間は公開済みの商品バージョンに従います。現在の下書きはお申し込みいただけません。'),
    ('APEX_GOLD_VAULT', 'en', 'Gold Vault', 'A gold-themed product presenting its mining core and reward records through a stable vault experience.', 'Rates and operating terms follow the published product version. This draft is not available to start.'),
    ('APEX_SILVER_VAULT', 'ko', '실버 볼트', '은 테마의 채굴 상태와 누적 기록을 간결하고 선명하게 확인하는 상품입니다.', '보상률과 운영 기간은 발행된 상품 버전을 따릅니다. 현재 초안은 신청할 수 없습니다.'),
    ('APEX_SILVER_VAULT', 'ja', 'シルバー・ボルト', '銀テーマのマイニング状況と累計記録を、簡潔で見やすく確認できる商品です。', '報酬率と運用期間は公開済みの商品バージョンに従います。現在の下書きはお申し込みいただけません。'),
    ('APEX_SILVER_VAULT', 'en', 'Silver Vault', 'A silver-themed product with a concise view of mining status and accumulated records.', 'Rates and operating terms follow the published product version. This draft is not available to start.')
) as content(product_code, locale, name, description, risk_notice)
  on content.product_code = mp.code
on conflict (product_id, locale) do nothing;
