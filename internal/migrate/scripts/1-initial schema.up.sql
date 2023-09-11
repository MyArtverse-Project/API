-- Setting up packages
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update updated_on when rows are updated
CREATE OR REPLACE FUNCTION trigger_set_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_on = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Creating the user table
CREATE TABLE IF NOT EXISTS user (
    user_id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    -- name for the account, like @StaxTheFox
    account_name TEXT NOT NULL,
    -- all lower name for searching, like @staxthefox
    normalized_name TEXT GENERATED ALWAYS AS (LOWER(account_name)) STORED,
    -- Custom name for display only, like "Stax the Foxxo :fox:"
    pretty_name TEXT NOT NULL DEFAULT account_name,
    pronouns TEXT NULL,
    account_type INT NOT NULL DEFAULT 0,
    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, email, account_name, normalized_name),
)
CREATE OR REPLACE TRIGGER set_timestamp BEFORE
UPDATE ON user FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


-- Table for password authentication
CREATE TABLE IF NOT EXISTS password_auth (
    auth_id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    password_hash NOT NULL,

    UNIQUE(auth_id, password_hash, user_id)
    -- User the password corresponds to
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES user (user_id),
)

-- Table for Fursonas
CREATE TABLE IF NOT EXISTS fursonas (
    fursona_id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    -- name for the fursona, like StaxTheFox, used in the URL
    url_name TEXT NOT NULL,
    -- all lower name for searching, like staxthefox
    normalized_name TEXT GENERATED ALWAYS AS (LOWER(url_name)) STORED,
    -- Custom name for display only, like "Stax the Foxxo :fox:"
    pretty_name TEXT NOT NULL DEFAULT account_name,
    biography TEXT NULL,
    species TEXT NOT NULL,
    -- Specifies the status of the fursona, like if it's open for adoption / owned / adopted
    adoption_status INT NOT NULL DEFAULT 0,

    created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(fursona_id, url_name, normalized_name)

    CONSTRAINT fk_owner_id FOREIGN KEY (user_id) REFERENCES user (user_id),
)
CREATE OR REPLACE TRIGGER set_timestamp BEFORE
UPDATE ON fursonas FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
