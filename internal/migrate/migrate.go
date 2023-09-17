package migrate

import (
	"database/sql"
	"embed"
)

//go:embed scripts/*.sql
var fs embed.FS

func Migrate(db *sql.DB) {

}
