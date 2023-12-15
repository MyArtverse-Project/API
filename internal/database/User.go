package database

import (
	"github.com/MyFursona-Project/Backend/internal/tools"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type createLocalUserReturn struct {
	UserID uuid.UUID `db:"result"`
}

func CreateLocalUser(db *sqlx.DB, email, username, password string) (uuid.UUID, error) {
	// Hash the password
	// TODO
	hash := password

	// Create the Verification Token
	token, err := tools.RandomString(32)
	if err != nil {
		return uuid.Nil, err
	}

	// Create the User
	row := db.QueryRow("SELECT createlocaluser(email_in := $1, account_name_in := $2, pretty_name_in := $2, hash_in := $3, verify_token := $4) AS result", email, username, hash, token)
	if err != nil {
		return uuid.Nil, err
	}

	var CreateReturn createLocalUserReturn
	err = row.Scan(&CreateReturn.UserID)
	if err != nil {
		return uuid.Nil, err
	}

	return CreateReturn.UserID, nil
}

func CheckSession() {
	//
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
