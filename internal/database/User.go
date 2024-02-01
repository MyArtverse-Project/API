package database

import (
	"errors"
	"github.com/MyFursona-Project/Backend/internal/tools"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type createLocalUserReturn struct {
	VerifyCode uuid.UUID `db:"result"`
}
type checkVerifyTokenResult struct {
	Status   int       `db:"status"`
	NewToken uuid.UUID `db:"new_token"`
}

func CreateLocalUser(db *sqlx.DB, email, username, password string) (uuid.UUID, error) {
	// Hash the password
	// TODO
	hash := password

	// Create the User
	row := db.QueryRow("SELECT createlocaluser(email_in := $1, account_name_in := $2, pretty_name_in := $2, hash_in := $3) AS result", email, username, hash)

	// Check the result
	var CreateReturn createLocalUserReturn
	err := row.Scan(&CreateReturn.VerifyCode)
	if err != nil {
		return uuid.Nil, err
	}

	return CreateReturn.VerifyCode, nil
}

// CheckVerifyToken checks the given code for validity.
func CheckVerifyToken(db *sqlx.DB, token uuid.UUID) (bool, uuid.UUID, error) {
	// Check the token against the DB
	row := db.QueryRow("SELECT status, new_token FROM ValidateEmailToken(token_in := $1)", token)

	// Parse the response
	var checkResult checkVerifyTokenResult
	err := row.Scan(&checkResult.Status, &checkResult.NewToken)
	if err != nil {
		return false, uuid.Nil, err
	}

	// Return Codes: 0 = Account verified, 1 = Code not found, 2 = Code Expired
	switch checkResult.Status {
	case 0:
		return true, uuid.Nil, nil
	case 1:
		return false, uuid.Nil, nil
	case 2:
		// The code is expired, we'll have a new one
		return false, checkResult.NewToken, nil

	default:
		return false, uuid.Nil, errors.New("received invalid value on Checking for a verify token")
	}
}

func CreateSession(db *sqlx.DB, user uuid.UUID, userAgent string) (string, error) {
	key, err := tools.RandomString(32)
	if err != nil {
		return "", err
	}

	_, err = db.Exec("INSERT INTO session (user_id, session_key, user_agent, active) VALUES ($1, $2, $3, TRUE)", user, key, userAgent)
	if err != nil {
		return "", err
	}

	return key, nil
}

type SessionCheckAnswer struct {
}

func CheckSession(db *sqlx.DB, sessionKey string) (bool, error) {
	res, err := db.Query("SELECT CheckSession(session_key_in) VALUES ($1)", sessionKey)
	if err != nil {
		return false, err
	}

	if res.Err() != nil {
		return false, res.Err()
	}

	//res.

	return true, nil
}
