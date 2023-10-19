package cmd

import (
	"github.com/MyFursona-Project/Backend/internal/database"
	"github.com/MyFursona-Project/Backend/internal/dbmigrate"
	"github.com/MyFursona-Project/Backend/internal/router"
)

func Start() {
	// Open DB Connection
	db, err := database.Connect()
	if err != nil {
		panic(err)
	}

	// Check DB Connection
	err = database.ConnectionTest()
	if err != nil {
		panic(err)
	}

	// Migrate Tables
	err = dbmigrate.Migrate(db)
	if err != nil {
		panic(err)
	}

	// Setup Router
	r := router.CreateRouter()

	// Setup Routes
	router.SetRoutes(r, db)

	// Start
	err = r.Run(router.GetListenerURL())
	if err != nil {
		panic(err)
	}
}
