package tools

import (
	"fmt"
	"time"
)

const (
	// LogLevelOff Log level constants
	LogLevelOff   = 0
	LogLevelError = 1
	LogLevelWarn  = 2
	LogLevelInfo  = 3
)

// var logLevel = LogLevelOff
var logLevel = LogLevelInfo

func SetLogLevel(level int) {
	if level >= 0 && level <= 3 {
		logLevel = level
	}
}

func GetLogLevel() int {
	return logLevel
}

// LogAlways Always writes the message to output, useful for service messages that should always be shown
func LogAlways(application, message string) {
	fmt.Println(time.Now().String() + " [Always] " + message)
}

// LogInfo Logging for information that could be handy for debugging a problem
func LogInfo(application, message string) {
	// Info and greater
	if logLevel >= LogLevelInfo {
		fmt.Println(time.Now().String() + " [Info] " + message)
	}
}

// LogWarn Logging for Warnings that might be problematic, but are not specific errors
func LogWarn(application, message string) {
	// Warn and greater
	if logLevel >= LogLevelWarn {
		fmt.Println(time.Now().String() + " [Warn] " + message)
	}
}

// LogError Logging for Errors, everything that was unexpected and dagerus
func LogError(application, message string) {
	// Error and greater
	if logLevel >= LogLevelError {
		fmt.Println(time.Now().String() + " [Error] " + message)
	}
}
