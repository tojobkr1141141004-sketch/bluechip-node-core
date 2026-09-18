insert into public.admin_roles (code, name, description, is_system)
values
  ('super_admin', '최고 관리자', '전체 시스템과 권한을 관리합니다.', true),
  ('operations_admin', '운영 관리자', '회원 및 일반 운영 업무를 관리합니다.', true),
  ('settlement_admin', '정산 관리자', '금융·정산 관련 운영 업무를 관리합니다.', true),
  ('content_admin', '콘텐츠 관리자', '공지·배너 등 콘텐츠 운영을 관리합니다.', true)
on conflict (code) do update
set name = excluded.name, description = excluded.description, is_system = excluded.is_system;

insert into public.admin_permissions (code, name, description)
values
  ('admin.access', 'Admin 접근', 'Admin 앱에 로그인하고 운영 영역에 접근할 수 있습니다.'),
  ('admin.users.read', '운영자 조회', '운영자 계정 정보를 조회할 수 있습니다.'),
  ('admin.users.manage', '운영자 관리', '운영자 계정을 활성화·비활성화할 수 있습니다.'),
  ('admin.roles.read', '역할 조회', '관리자 역할과 권한 구성을 조회할 수 있습니다.'),
  ('admin.roles.manage', '역할 관리', '관리자 역할 정의를 변경할 수 있습니다.'),
  ('admin.user_roles.manage', '역할 배정', '운영자에게 역할을 부여하거나 제거할 수 있습니다.'),
  ('members.read', '회원 조회', '회원 프로필을 조회할 수 있습니다.'),
  ('members.manage', '회원 관리', '회원 관리 작업을 수행할 수 있습니다.'),
  ('audit.read', '운영 기록 조회', '감사 로그를 조회할 수 있습니다.'),
  ('finance.read', '금융 조회', '금융 관련 운영 정보를 조회할 수 있습니다.'),
  ('finance.manage', '금융 처리', '금융 관련 운영 작업을 처리할 수 있습니다.'),
  ('content.read', '콘텐츠 조회', '콘텐츠 운영 정보를 조회할 수 있습니다.'),
  ('content.manage', '콘텐츠 관리', '콘텐츠 운영 정보를 변경할 수 있습니다.')
on conflict (code) do update
set name = excluded.name, description = excluded.description;

with role_permissions(role_code, permission_code) as (
  values
    ('super_admin', 'admin.access'),
    ('super_admin', 'admin.users.read'),
    ('super_admin', 'admin.users.manage'),
    ('super_admin', 'admin.roles.read'),
    ('super_admin', 'admin.roles.manage'),
    ('super_admin', 'admin.user_roles.manage'),
    ('super_admin', 'members.read'),
    ('super_admin', 'members.manage'),
    ('super_admin', 'audit.read'),
    ('super_admin', 'finance.read'),
    ('super_admin', 'finance.manage'),
    ('super_admin', 'content.read'),
    ('super_admin', 'content.manage'),
    ('operations_admin', 'admin.access'),
    ('operations_admin', 'members.read'),
    ('operations_admin', 'members.manage'),
    ('operations_admin', 'audit.read'),
    ('settlement_admin', 'admin.access'),
    ('settlement_admin', 'finance.read'),
    ('settlement_admin', 'finance.manage'),
    ('content_admin', 'admin.access'),
    ('content_admin', 'content.read'),
    ('content_admin', 'content.manage')
)
insert into public.admin_role_permissions (role_id, permission_id)
select r.id, p.id
from role_permissions rp
join public.admin_roles r on r.code = rp.role_code
join public.admin_permissions p on p.code = rp.permission_code
on conflict (role_id, permission_id) do nothing;
