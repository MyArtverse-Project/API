package sessionAuth

import "github.com/gin-contrib/sessions/redis"

func SetupSessionGin() (redis.Store, error) {
	return redis.NewStore(10, "tcp", "localhost:6379", "", []byte("secret"))
}
