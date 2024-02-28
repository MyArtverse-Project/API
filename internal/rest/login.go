package rest

import (
	"github.com/MyFursona-Project/Backend/internal/database"
	"github.com/MyFursona-Project/Backend/internal/tools"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"net/http"
)

type LoginData struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Session string `json:"session"`
}

func AuthLogin(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check for the right content-Header
		if c.ContentType() != "application/json" {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		// Marshal request data
		var loginData LoginData
		err := c.BindJSON(&loginData)
		if err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			tools.LogError("MyFursona", err.Error())
			return
		}

		var session LoginResponse
		session.Session, err = database.CheckLocalLogin(db, loginData.Login, &loginData.Password, c.Request.Header["User-Agent"][0])
		if err != nil {
			c.AbortWithStatus(http.StatusUnauthorized)
			tools.LogError("MyFursona", err.Error())
			return
		}

		// Return the session
		c.JSON(http.StatusOK, &session)
		return
	}
}
