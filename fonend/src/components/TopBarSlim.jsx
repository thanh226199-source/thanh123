import React from "react";
import { useNavigate } from "react-router-dom";

export default function TopBarSlim({
  logoSrc,
  title,
  subtitle,
  rightText = "Về trang chính",
  rightTo = "/dashboard",
  children,
}) {
  const navigate = useNavigate();

  return (
    <div className="ttq-slimbar">
      <div className="ttq-slimbar-left">
        <img className="ttq-slimbar-logo" src={logoSrc} alt="TTQ" />
        <div className="ttq-slimbar-text">
          <div className="ttq-slimbar-title">{title}</div>
          <div className="ttq-slimbar-sub">{subtitle}</div>
        </div>
      </div>

      <div className="ttq-slimbar-right">
        {children}
        <button className="ttq-slimbar-btn" onClick={() => navigate(rightTo)}>
          {rightText}
        </button>
      </div>
    </div>
  );
}
