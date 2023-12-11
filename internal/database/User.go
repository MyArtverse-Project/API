package database

import (
	"errors"
	"github.com/MyFursona-Project/Backend/internal/tools"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type userdata struct {
	UserId uuid.UUID `db:"user_id"`
}

type verify struct {
	Token uuid.UUID `db:"token"`
}

func CreateUser(db *sqlx.DB, email, username string) (uuid.UUID, error) {
	userID, err := uuid.NewRandom()
	if err != nil {
		return uuid.Nil, err
	}

	_, err = db.Exec("INSERT INTO userdata (email, account_name, pretty_name, user_id) VALUES ($1, $2, $2, $3) RETURNING user_id", email, username, userID)
	if err != nil {
		return uuid.UUID{}, err
	}

	return userID, nil
}

func CreatePassword(db *sqlx.DB, userID uuid.UUID, password string) error {
	_, err := db.Exec("INSERT INTO password_auth (user_id, password_hash) VALUES ($1, $2)", userID, password)

	return err
}

func CreateEmailToken(db *sqlx.DB, userID uuid.UUID) (string, error) {
	token, err := tools.RandomString(32)
	if err != nil {
		return "", err
	}

	_, err = db.Exec("INSERT INTO verify (user_id, token) VALUES ($1, $2)", userID, token)
	if err != nil {
		return "", err
	}

	return token, nil
}

func VerifyEmailToken(db *sqlx.DB, token uuid.UUID) error {
	res, err := db.Exec("DELETE FROM verify WHERE token = $1", token)
	if err != nil {
		return err
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return err
	} else if affected != 1 {
		return errors.New("verify token wasn't found in the DB")
	}

	return nil
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

	res.

	return true, nil
}
