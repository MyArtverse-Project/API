package tools

import (
	"fmt"
	"time"
)

const (
	// Log level constants
	LogLevelOff   = 0
	LogLevelInfo  = 1
	LogLevelWarn  = 2
	LogLevelError = 3
)

var logLevel = LogLevelOff

func SetLogLevel(level int) {
	if level >= 0 && level <= 3 {
		logLevel = level
	}
}

func GetLogLevel() int {
	return logLevel
}

// Always writes the message to output, useful for service messages that should always be shown
func LogAlways(application, message string) {
	fmt.Println(time.Now().String() + " [Always] " + message)
}

// Logging for informations that could be handy for debugging a problem
func LogInfo(application, message string) {
	// Info and greater
	if logLevel > 0 {
		fmt.Println(time.Now().String() + " [Info] " + message)
	}
}

// Logging for Warnings that might be problematic, but are not specific errors
func LogWarn(application, message string) {
	// Warn and greater
	if logLevel > 1 {
		fmt.Println(time.Now().String() + " [Warn] " + message)
	}
}

// Logging for Errors, everything that was unexpected and dagerus
func LogError(application, message string) {
	// Warn and greater
	if logLevel > 1 {
		fmt.Println(time.Now().String() + " [Error] " + message)
	}
}
