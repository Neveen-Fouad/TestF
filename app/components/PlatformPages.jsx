"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { API_BASE_URL, api, ApiError, jwtSubject } from "@/app/lib/api";

// Stub placeholder components for pages not yet fully implemented in JSX.
// The live application runs from public/voyago.html + voyago.js.

function Placeholder({ name }) {
  return <section className="panel" style={{ padding: 40, textAlign: "center" }}><h2>{name}</h2><p>This page component is rendered by the live app.</p></section>;
}

export function OverviewPage({ notify, onNavigate, token }) {
  return <Placeholder name="Overview" />;
}

export function CountriesPage({ notify, onNavigate }) {
  return <Placeholder name="Countries" />;
}

export function HotelsPage({ notify, onNavigate, token }) {
  return <Placeholder name="Hotels" />;
}

export function RestaurantsPage({ notify, onNavigate, token }) {
  return <Placeholder name="Restaurants" />;
}

export function FlightsPage({ notify, onNavigate, token }) {
  return <Placeholder name="Flights" />;
}

export function TripPlannerPage({ notify, onNavigate, token }) {
  return <Placeholder name="Trip Planner" />;
}

export function TripsPage({ notify, onNavigate, token }) {
  return <Placeholder name="My Trips" />;
}

export function PaymentsPage({ notify, onNavigate, token }) {
  return <Placeholder name="Payments" />;
}

export function JoyPage({ notify, onNavigate, token }) {
  return <Placeholder name="Joy AI" />;
}

export function ContactPage({ notify, onNavigate, token }) {
  return <Placeholder name="Contact" />;
}

export function AdminPage({ section, notify, onNavigate, token }) {
  return <Placeholder name={`Admin – ${section}`} />;
}
