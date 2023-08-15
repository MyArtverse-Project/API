package database

type User struct {
	ID          string
	Username    string
	Prettyname  string
	Pronouns    string
	AccountType int
	Theme       int
	Adult       bool
}

type Commission struct {
	UserID  string
	Banner  string
	Price   string
	Details string
}

type Fursona struct {
	ID          string
	OwnerID     string
	Name        string
	Description string
	Species     string
	Status      int // Adoption | Adopted | Owned
}

type Like struct {
	ID        string
	FursonaID string
	UserID    string
}
