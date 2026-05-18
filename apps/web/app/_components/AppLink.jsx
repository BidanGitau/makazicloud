import { Link } from "react-router";

export default function AppLink({ href, to, ...props }) {
  return <Link to={to || href || "/"} {...props} />;
}
