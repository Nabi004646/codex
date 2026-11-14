// Staging has no analytics collector. Public interactions must not send queries,
// identifiers or outbound events to an unconnected legacy endpoint.
export function recordEvent(_event){}
