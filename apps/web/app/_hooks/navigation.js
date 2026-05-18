import {
  useLocation,
  useNavigate,
  useParams as useRouterParams,
  useSearchParams as useRouterSearchParams,
} from "react-router";
import { useMemo } from "react";

export function useRouter() {
  const navigate = useNavigate();

  return useMemo(
    () => ({
      push: (href, options) => navigate(href, options),
      replace: (href, options) => navigate(href, { ...options, replace: true }),
      back: () => navigate(-1),
      forward: () => navigate(1),
      refresh: () => {},
      prefetch: () => Promise.resolve(),
    }),
    [navigate],
  );
}

export function usePathname() {
  return useLocation().pathname;
}

export function useSearchParams() {
  const [searchParams] = useRouterSearchParams();
  return searchParams;
}

export function useParams() {
  return useRouterParams();
}

export function redirect(href) {
  throw new Response(null, {
    status: 302,
    headers: { Location: href },
  });
}
