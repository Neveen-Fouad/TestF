export function Brand({ inverse = false, compact = false, onClick }) {
  return (
    <button className={`brand ${inverse ? "brandInverse" : ""} ${compact ? "brandCompact" : ""}`} onClick={onClick} aria-label="Go to Vamora home">
      <img src={inverse ? "/vamora-logo-light.svg" : "/vamora-logo.svg"} alt="Vamora" />
    </button>
  );
}
