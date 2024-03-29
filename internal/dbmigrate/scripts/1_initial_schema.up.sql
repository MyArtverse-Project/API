-- Setting up packages
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update updated_on when rows are updated
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
        RETURNS TRIGGER
    AS
$$
    BEGIN
        NEW.updated_on = NOW();
    RETURN NEW;
    END;
$$ LANGUAGE plpgsql;

-- Creating the user table
CREATE TABLE IF NOT EXISTS userdata (
    user_id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    -- name for the account, like @StaxTheFox
    account_name TEXT UNIQUE NOT NULL,
    -- all lower name for searching, like @staxthefox
    normalized_name TEXT UNIQUE GENERATED ALWAYS AS (LOWER(account_name)) STORED,
    -- Custom name for display only, like "Stax the Foxxo :fox:"
    pretty_name TEXT NOT NULL,
    pronouns TEXT NULL,
    account_type INT NOT NULL DEFAULT 0,
    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_on TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE TRIGGER set_timestamp BEFORE
UPDATE ON userdata FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


-- Table for password authentication
CREATE TABLE IF NOT EXISTS password_auth (
    id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    password_hash TEXT UNIQUE NOT NULL,
    user_id UUID UNIQUE NOT NULL,

    -- User the password corresponds to
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES userdata (user_id) ON DELETE CASCADE
);

-- Table for Fursonas
CREATE TABLE IF NOT EXISTS fursonas (
    fursona_id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    -- name for the fursona, like StaxTheFox, used in the URL
    url_name TEXT UNIQUE NOT NULL,
    -- all lower name for searching, like staxthefox
    normalized_name TEXT UNIQUE GENERATED ALWAYS AS (LOWER(url_name)) STORED,
    -- Custom name for display only, like "Stax the Foxxo :fox:"
    pretty_name TEXT NOT NULL,
    biography TEXT NULL,
    species TEXT NOT NULL,
    -- Specifies the status of the fursona, like if it's open for adoption / owned / adopted
    adoption_status INT NOT NULL DEFAULT 0,

    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    user_id UUID NOT NULL,

    CONSTRAINT fk_owner_id FOREIGN KEY (user_id) REFERENCES userdata (user_id) ON DELETE CASCADE
);
CREATE OR REPLACE TRIGGER set_timestamp BEFORE
UPDATE ON fursonas FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS verify (
    id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL,
    token UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    valid_until TIMESTAMPTZ NOT NULL DEFAULT NOW() + '2 weeks',

    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_owner_id FOREIGN KEY (user_id) REFERENCES userdata (user_id) ON DELETE CASCADE
);
CREATE OR REPLACE TRIGGER set_timestamp BEFORE
UPDATE ON verify FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- Function to create a new user with password login
CREATE OR REPLACE FUNCTION CreateLocalUser(email_in TEXT, account_name_in TEXT, pretty_name_in TEXT, hash_in TEXT)
    RETURNS UUID
    LANGUAGE plpgsql
AS
$$
DECLARE
    user_id_l UUID;
    verify_token_l UUID;
BEGIN
--     Create the User
    INSERT INTO userdata (email, account_name, pretty_name) VALUES (email_in, account_name_in, pretty_name_in) RETURNING user_id INTO user_id_l;

--     Set the password
    INSERT INTO password_auth (user_id, password_hash) VALUES (user_id_l, hash_in);

--     Set the email verification token
    INSERT INTO verify (user_id) VALUES (user_id_l) RETURNING token INTO verify_token_l;

--     Return the UserID of the created user
    RETURN verify_token_l;
END;
$$;

-- Function to Validate and delete the Email verification Code
CREATE OR REPLACE FUNCTION ValidateEmailToken(IN token_in UUID, OUT status int2, OUT new_token UUID)
--     Return Codes: 0 = Account verified, 1 = Code not found, 2 = Code Expired
    RETURNS RECORD
    LANGUAGE plpgsql
AS
$$
DECLARE
    valid_until_l TIMESTAMPTZ;
    new_token_l UUID;
BEGIN
--     Find the token
    SELECT valid_until INTO valid_until_l FROM verify WHERE token = token_in;
    IF NOT FOUND THEN
--         The token was not found
        status := 1;
        new_token = uuid_nil();
        RETURN;
    END IF;

--     Check if the token is valid
    IF valid_until_l < NOW() THEN
--         We'll set a new code since the old one is not valid anymore
        new_token_l = uuid_generate_v4();
        UPDATE verify SET token = new_token_l WHERE token = token_in;

--         Return the new token
        status := 2;
        new_token := new_token_l;
        RETURN;
    end if;

--     Delete it
    DELETE FROM verify WHERE token = token_in;

    status := 0;
    new_token = uuid_nil();
    RETURN;
END;
$$;

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,

    session_key TEXT UNIQUE NOT NULL,
    user_agent TEXT NOT NULL,

    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ NOT NULL DEFAULT NOW() + '2 weeks',
    active BOOL NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_owner_id FOREIGN KEY (user_id) REFERENCES userdata (user_id) ON DELETE CASCADE
);

-- Handy utility function to check the session, while it'll automatically increase the session lifetime
CREATE OR REPLACE FUNCTION CheckSession(session_key_in TEXT)
    RETURNS UUID
    LANGUAGE plpgsql
AS
$$
DECLARE
    session_valid_to TIMESTAMPTZ;
    user_id_l UUID;
BEGIN
    SELECT valid_to, user_id INTO session_valid_to, user_id_l FROM sessions WHERE session_key = session_key_in AND active = TRUE;

--     Check if the session was found
    IF NOT FOUND THEN
        RETURN uuid_nil();
    END IF;

--     Check if the session is still valid
    IF session_valid_to < NOW() THEN
--         Mark the session key as inactive
        UPDATE sessions SET active = FALSE WHERE session_key = session_key_in;
        RETURN uuid_nil();
    END IF;

--     Increase the session lifetime again
    UPDATE sessions SET valid_to = NOW() + '2 weeks' WHERE session_key = session_key_in;

--     Done
    RETURN user_id_l;
END;
$$;
