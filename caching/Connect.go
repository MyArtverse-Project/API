package caching

import "github.com/gin-contrib/sessions/redis"

func RedisConnect() (redis.Store, error) {
	return redis.NewStore(20, "tcp", "localhost:6379", "TsimdoCBK5roPYhrVLnLj8Us1mOHfgIYoGP5kaeB", []byte("password"))
}
