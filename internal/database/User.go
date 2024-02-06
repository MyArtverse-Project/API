package database

import (
	"database/sql"
	"errors"
	"github.com/MyFursona-Project/Backend/internal/tools"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"net/mail"
)

type createLocalUserReturn struct {
	VerifyCode uuid.UUID `db:"result"`
}
type checkVerifyTokenResult struct {
	Status   int       `db:"status"`
	NewToken uuid.UUID `db:"new_token"`
}

func CreateLocalUser(db *sqlx.DB, email, username, password *string) (uuid.UUID, error) {
	// Hash the password
	hash, err := tools.CreateHash(password)
	if err != nil {
		return uuid.Nil, err
	}

	// Create the User
	row := db.QueryRow("SELECT createlocaluser(email_in := $1, account_name_in := $2, pretty_name_in := $2, hash_in := $3) AS result", email, username, hash)

	// Check the result
	var CreateReturn createLocalUserReturn
	err = row.Scan(&CreateReturn.VerifyCode)
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
	UserID uuid.UUID `db:"response"`
}

func CheckSession(db *sqlx.DB, sessionKey string) (uuid.UUID, error) {
	row := db.QueryRow("SELECT CheckSession(session_key_in) VALUES ($1) AS response", sessionKey)
	if row.Err() != nil {
		return uuid.Nil, row.Err()
	}

	var sessionRow SessionCheckAnswer
	err := row.Scan(&sessionRow.UserID)
	if err != nil {
		return uuid.Nil, err
	}

	return sessionRow.UserID, nil
}

type LocalLoginRow struct {
	Hash   string    `db:"password_hash"`
	UserID uuid.UUID `db:"user_id"`
}

func CheckLocalLogin(db *sqlx.DB, login string, password *string, userAgent string) (string, error) {
	var row *sql.Row

	_, err := mail.ParseAddress(login)
	if err == nil {
		row = db.QueryRow("SELECT password_hash, userdata.user_id FROM password_auth INNER JOIN userdata ON password_auth.user_id = userdata.user_id WHERE userdata.email = $1", login)
	} else {
		row = db.QueryRow("SELECT password_hash, userdata.user_id FROM password_auth INNER JOIN userdata ON password_auth.user_id = userdata.user_id WHERE userdata.normalized_name = LOWER($1)", login)
	}

	if row.Err() != nil {
		return "", row.Err()
	}

	var loginRow LocalLoginRow
	err = row.Scan(&loginRow.Hash, &loginRow.UserID)
	if err != nil {
		return "", err
	}

	match, err := tools.ComparePasswordAndHash(password, &loginRow.Hash)
	if err != nil {
		return "", err
	}

	if !match {
		return "", errors.New("obtained password doesn't match with the provided one")
	}

	session, err := tools.RandomString(32)
	if err != nil {
		return "", err
	}

	_, err = db.Exec("INSERT INTO sessions (user_id, session_key, user_agent, valid_to, active) VALUES ($1, $2, $3, now() + '2 weeks', TRUE)", loginRow.UserID, session, userAgent)

	if err != nil {
		return "", err
	}

	return session, nil
}
