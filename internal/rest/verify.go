package rest

import (
	"github.com/MyFursona-Project/Backend/internal/database"
	"github.com/MyFursona-Project/Backend/internal/tools"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"net/http"
)

func AuthVerify(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.Status(http.StatusBadRequest)
			return
		}

		found, newCode, err := database.CheckVerifyToken(db, token)
		if err != nil {
			tools.LogError("myfursona", "Failed to check the verification code: "+err.Error())
			c.Status(http.StatusNotFound)
			return
		} else if !found && newCode != uuid.Nil {
			//	TODO: Send a new confirmation email
			tools.LogInfo("myfursona", "The old Verification code was expired, the new one is: "+newCode.String())
			c.Status(http.StatusCreated)
			return
		}

		// The verification process worked just fine
		c.Status(http.StatusOK)
		return
	}
}
