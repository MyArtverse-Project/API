package database

import (
	"github.com/jmoiron/sqlx"
	"github.com/spf13/viper"
)

const (
	DBURIENV = "MYFURSONA_DB_URI"
)

func GetConnectionString() string {
	return viper.GetString(DBURIENV)
}

func Connect() (*sqlx.DB, error) {
	return sqlx.Connect("postgres", GetConnectionString())
}

func ConnectionTest() error {
	// TODO
	return nil
}
