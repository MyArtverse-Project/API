package dbmigrate

import (
	"embed"
	"errors"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jmoiron/sqlx"
)

//go:embed scripts/*.sql
var fs embed.FS

func Migrate(db *sqlx.DB) error {
	driver, err := postgres.WithInstance(db.DB, &postgres.Config{})
	if err != nil {
		return err
	}
	fmt.Println("loading scripts")
	scripts, err := iofs.New(fs, "scripts")
	if err != nil {
		return err
	}

	fmt.Println("Applying scripts")
	migrateIns, err := migrate.NewWithInstance("iofs", scripts, "myfursona", driver)
	if err != nil {
		return err
	}

	fmt.Println("Migrating scripts")
	err = migrateIns.Up()
	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}

	return nil
}
