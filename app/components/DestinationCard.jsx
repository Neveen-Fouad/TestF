export function DestinationCard({ destination, saved, onToggleSave, onSelect }) {
  return (
    <article className="destinationCard">
      <div className="destinationImage" style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(11,31,74,.36)), url(${destination.image})` }}>
        <span>{destination.country}</span>
        <button className="heartButton" onClick={onToggleSave} aria-pressed={saved} aria-label={`Save ${destination.name}`}>{saved ? "♥" : "♡"}</button>
      </div>
      <div className="destinationBody">
        <div className="rating">★ {destination.rating}</div>
        <h3>{destination.name}</h3>
        <p>{destination.description}</p>
        <div className="cardFoot"><strong>From ${destination.price.toLocaleString()}</strong><button className="textButton" onClick={onSelect}>Explore →</button></div>
      </div>
    </article>
  );
}
