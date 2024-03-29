package rest

import (
	"github.com/MyFursona-Project/Backend/internal/database"
	"github.com/MyFursona-Project/Backend/internal/tools"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"net/http"
	"strings"
)

func AuthWhoAmI(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		bearerToken := c.Request.Header.Get("Authorization")

		session := strings.Split(bearerToken, " ")[1]

		_, err := database.CheckSession(db, session)
		if err != nil {
			tools.LogError("myfursona", "Failed to check the verification code: "+err.Error())
			c.Status(http.StatusUnauthorized)
			return
		}

		c.Status(http.StatusOK)
	}
}
