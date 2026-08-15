export function getHotelId(hotelOrId) {
  const rawId = hotelOrId && typeof hotelOrId === "object"
    ? hotelOrId.id || hotelOrId.hotel_id || hotelOrId.hotelId || hotelOrId.propertyId || hotelOrId.property?.id || hotelOrId.node?.id
    : hotelOrId;
  const value = typeof rawId === "object" ? rawId?.id || rawId?.value : rawId;
  const id = String(value ?? "").trim();

  return /^[1-9]\d*$/.test(id) ? id : null;
}
