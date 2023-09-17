package main

import (
	"log"
	"net/http"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/MyFursona-Project/Backend/internal/dbmigrate"
	"github.com/MyFursona-Project/Backend/internal/graph"
	"github.com/MyFursona-Project/Backend/internal/router"
	"github.com/jmoiron/sqlx"
)

const defaultPort = "8081"

func main() {
	src := "postgres://myfursona:myfursona@localhost:5432?sslmode=disable"

	db, err := sqlx.Connect("postgres", src)
	if err != nil {
		panic(err)
	}

	err = dbmigrate.Migrate(db)
	if err != nil {
		panic(err)
	}

	srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{Resolvers: &graph.Resolver{}}))

	http.Handle("/", playground.Handler("GraphQL playground", "/query"))
	http.Handle("/query", srv)

	log.Printf("connect to http://localhost:%s/ for GraphQL playground", router.GetListenerURL())
	log.Fatal(http.ListenAndServe(router.GetListenerURL(), nil))
}
