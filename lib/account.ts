export default interface AccountProps {
    id: string;
    companyId: string;
    name: string;
    username: string;
    email: string;
    phone: string | null;
    avatar?: string;
    email_verified_at: string;
    last_login: string;
    is_active: number;
    last_login_ip: string | null;
    banned: number;
    banned_reason: string | null;
    created_at: string;
    updated_at: string;
    device_id: string | null;
    package_id: string | null;
    roles: any[];
}