import { Redis } from '@upstash/redis'

/** 프로세스당 하나의 인스턴스만 생성됨(모듈 캐시). import하는 쪽은 모두 동일한 redis 참조를 사용. */
export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})