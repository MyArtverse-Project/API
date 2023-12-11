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
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES userdata (user_id)
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

    CONSTRAINT fk_owner_id FOREIGN KEY (user_id) REFERENCES userdata (user_id)
);
CREATE OR REPLACE TRIGGER set_timestamp BEFORE
UPDATE ON fursonas FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS verify (
    id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL,
    token UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),

    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_owner_id FOREIGN KEY (user_id) REFERENCES userdata (user_id)
);
CREATE OR REPLACE TRIGGER set_timestamp BEFORE
UPDATE ON fursonas FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,

    session_key TEXT UNIQUE NOT NULL,
    user_agent TEXT NOT NULL,

    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ NOT NULL DEFAULT NOW() + '2 weeks',
    active BOOL NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_owner_id FOREIGN KEY (user_id) REFERENCES userdata (user_id)
);

CREATE OR REPLACE TRIGGER set_timestamp BEFORE
UPDATE ON sessions FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- Handy utility function to check the session, while it'll automatically increase the session lifetime
CREATE OR REPLACE FUNCTION CheckSession(session_key_in TEXT)
    RETURNS BOOL
    LANGUAGE plpgsql
AS
$$
DECLARE
    session_valid_to TIMESTAMPTZ;
BEGIN
    SELECT valid_to INTO session_valid_to FROM sessions WHERE session_key = session_key_in AND active = TRUE;

--     Check if the session was found
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

--     Check if the session is still valid
    IF session_valid_to < NOW() THEN
        RETURN FALSE;
    END IF;

--     Increase the session lifetime again
    UPDATE sessions SET valid_to = NOW() + '2 weeks' WHERE session_key = session_key_in;

--     Done
    RETURN TRUE;
END;
$$;
