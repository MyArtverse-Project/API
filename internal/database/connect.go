package database

import (
	"os"

	"github.com/jmoiron/sqlx"
)

const (
	DBURIENV = "MYFURSONA_DB_URI"
)

func GetConnectionString() string {
	return os.Getenv(DBURIENV)
}

func Connect() (*sqlx.DB, error) {
	return sqlx.Connect("postgres", GetConnectionString())
}

func ConnectionTest() error {
	// TODO
	return nil
}
