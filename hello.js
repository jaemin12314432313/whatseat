function hello() {
    console.log("Hello, world!");
}

hello();

// 정규표현식을 사용하여 이메일 형식이 유효한지 체크하는 함수
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

console.log(isValidEmail("test@example.com"));
console.log(isValidEmail("test@example.com.kr"));
console.log(isValidEmail("test@example.com.kr.kr"));
console.log(isValidEmail("test@example.com.kr.kr.kr"));
console.log(isValidEmail("test@example.com.kr.kr.kr.kr"));
console.log(isValidEmail("test@example.com.kr.kr.kr.kr.kr"));       