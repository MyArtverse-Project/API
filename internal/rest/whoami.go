package rest

import (
	"github.com/MyFursona-Project/Backend/internal/database"
	"github.com/MyFursona-Project/Backend/internal/tools"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"net/http"
)

func AuthWhoAmI(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {

		session, err := c.Cookie("S-SESSION-MF")
		if err != nil {
			tools.LogError("myfursona", "Failed to check the verification code: "+err.Error())
			c.Status(http.StatusUnauthorized)
			return
		}

		_, err = database.CheckSession(db, session)
		if err != nil {
			tools.LogError("myfursona", "Failed to check the verification code: "+err.Error())
			c.Status(http.StatusUnauthorized)
			return
		}

		c.Status(http.StatusOK)
	}
}
