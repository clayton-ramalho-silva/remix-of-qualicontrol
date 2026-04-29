import * as React from "react";
export const Streamdown: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={className} style={{ whiteSpace: "pre-wrap" }}>{children}</div>
);
