import { z } from "zod";

/**
 * 참여자 이름(모임장 포함) 최대 길이. 화면 입력과 서버 검증이 같은 값을 쓴다.
 * 영문 닉네임이나 "민지 B"처럼 동명이인을 구분할 수 있게 10자까지 받는다(DB 컬럼은 50자).
 */
export const NAME_MAX_LENGTH = 10;

export const participantName = z.string().trim().min(1).max(NAME_MAX_LENGTH);
