package router

import (
	"github.com/MyFursona-Project/Backend/internal/rest"
	"github.com/jmoiron/sqlx"
	"net/http"

	"github.com/gin-gonic/gin"
)

func SetRoutes(router *gin.Engine, db *sqlx.DB) {
	//router.Use(sessions.Sessions("MF-SESSION-ID", *store))
	router.GET("/health", GetHealth)
	router.POST("/v1/auth/register", rest.AuthRegister(db))
	router.GET("/v1/auth/verify/:id", rest.AuthVerify(db))
	router.POST("v1/auth/login", rest.AuthLogin(db))
	router.GET("/v1/auth/whoami", rest.AuthWhoAmI(db))
}

// GetHealth returns a static health message
func GetHealth(c *gin.Context) {
	c.Data(http.StatusOK, "application/json", []byte(`{"status":"ok"}`))
}

// ImTeaPot returns that the server is not a teapot
func ImTeaPot(c *gin.Context) {
	c.String(http.StatusTeapot, "418: I'm a teapot")
}

// CoffeeOut returns that the combined coffee/tea pot is temporarily out of coffee
func CoffeeOut(c *gin.Context) {
	c.Data(http.StatusServiceUnavailable, "application/json", []byte(`{"error":"true","message":"Temporary out of coffee, please try again later!"}`))
}
