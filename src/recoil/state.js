import { atom } from 'recoil';

/*
    날짜: 2025. 07. 02. 09:34
    작성자: 임성식
    작성내용: 애플리케이션 데이터들을 담는 atom
*/
export const applicationsState = atom({
  key: 'applicationsState',
  default: [],
});

/*
    날짜: 2025. 07. 02. 09:35
    작성자: 임성식
    작성내용: 페이지 초기 셋팅 atom
*/
export const pagesState = atom({
  key: "pagesState",
  default: [],
});