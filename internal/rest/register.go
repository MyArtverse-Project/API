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
			fmt.Println("Error: " + err.Error())
			return
		}

		// Check request captcha response

		// Check request data
		// TODO: Create

		// create User
		UID, err := database.CreateUser(db, request.Email, request.Username)
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			tools.LogError("MyFursona", err.Error())
			fmt.Println("Error: " + err.Error())
			return
		}

		// Create Password login
		// TODO: Add hashing

		// Create email token
		// TODO: Cache in Redis
		_, err = database.CreateEmailToken(db, UID)
		if err != nil {
			return
		}

		// Store the email token into redis
		// TODO:

		// send email
		// TODO:

		// Success response
		c.Status(http.StatusCreated)
	}
}

func SetPassword(password string) {
	// Hash the password

	// Store it into the DB

}
