import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";

interface NavbarProps {
    title?: string;
    backTo?: string;
    actions?: React.ReactNode;
}

export function Navbar({ title, backTo, actions }: NavbarProps) {
    const { user, clearAuth } = useAuthStore();
    const navigate = useNavigate();

    function handleLogout() {
        clearAuth();
        navigate('/login');
    }

    return (
        <header className="h-14 bg-surface border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
            {/** Left */}
            <div className="flex items-center gap-2 min-w-0">
                {backTo && (
                    <Link
                        to={backTo}
                        className="p-1.5 rounded-lg text-ink-secondary hover:bg-surface-raised hover:text-ink transition-colors">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="None">
                                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                    </Link>
                )}
                <Link to="/boards" className="flex items-center gap-2 flex-shrink-0">
                    <TaskFlowLogo />                
                    {!title && <span className="font-semibold text-sm text-ink hidden sm:block">TaskFlow</span>}
                </Link>
                {title && (
                    <>
                        <span className="text-border-strong text-sm hidden sm:block"></span>
                        <span className="text-sm font-medium text-ink truncate">{title}</span>
                    </>
                )}
            </div>

            {/** Center actions */}
            {actions && <div className="flex-1 flex items-center gap-2">{actions}</div>}
            {!actions && <div className="flex-1" />}
        
            {/** Right - user menu */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                        {user?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="ml-1 px-3 py-1.5 text-xs text-ink-secondary hover:text-ink hover:bg-surface-raised rounded-lg transition-colors">
                            Sign out
                        </button>
                </div>
            </div>
        </header>
    )
}


function TaskFlowLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="currentColor" className="text-[--color-accent]" />
      <rect x="6" y="7" width="6" height="6" rx="1.5" fill="white" />
      <rect x="6" y="15" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
      <rect x="14" y="7" width="8" height="3" rx="1.5" fill="white" fillOpacity="0.4" />
      <rect x="14" y="12" width="6" height="3" rx="1.5" fill="white" fillOpacity="0.6" />
      <rect x="14" y="17" width="4" height="3" rx="1.5" fill="white" fillOpacity="0.3" />
    </svg>
  );
}