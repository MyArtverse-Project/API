package rest

import (
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"net/http"
)

func AuthVerify(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		//token, err := uuid.Parse(c.Param("id"))
		//if err != nil {
		//	c.Status(http.StatusBadRequest)
		//	return
		//}
		//
		////err = database.VerifyEmailToken(db, token)
		//if err != nil {
		//	c.Status(http.StatusNotFound)
		//}

		c.Status(http.StatusOK)
	}
}
