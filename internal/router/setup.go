package router

import "os"

const (
	// We'll listen on this port, if nothing was specified
	defaultPort = "8080"
	// We'll listen on all interfaces by default
	defaultInterface = "0.0.0.0"
	portENV          = "FURSONA_PORT"
	interfaceENV     = "FURSONA_INTERFACE"
)

func GetListenerURL() string {
	// Determine the port we'll listen on
	port := os.Getenv(portENV)
	if port == "" {
		port = defaultPort
	}

	// Determine the interface we'll bind to
	inf := os.Getenv(interfaceENV)
	if inf == "" {
		inf = defaultInterface
	}

	// Build the URL together
	return inf + ":" + port
}
