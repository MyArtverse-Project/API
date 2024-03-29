package rest

import (
	"fmt"
	"github.com/MyFursona-Project/Backend/internal/tools"
	"net/http"

	"github.com/MyFursona-Project/Backend/internal/database"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type authRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Captcha  string `json:"captcha"`
}

func AuthRegister(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check for the right content-Header
		if c.ContentType() != "application/json" {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		// Marshal request data
		var request authRequest
		err := c.BindJSON(&request)
		if err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			tools.LogError("MyFursona", err.Error())
			return
		}

		// Check request captcha response

		// Check request data
		// TODO: Create

		// create A local user with password login and email verification
		token, err := database.CreateLocalUser(db, &request.Email, &request.Username, &request.Password)
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			tools.LogError("MyFursona", err.Error())
			return
		}

		// Store the email token into caching
		// TODO:

		// send email
		// TODO:
		fmt.Println("Email Token: " + token.String())

		// Success response
		c.Status(http.StatusCreated)
	}
}
