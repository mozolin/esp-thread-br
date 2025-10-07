/*
// Использование:
console.log(str_pad('test', 10)); // 'test      '
console.log(str_pad('test', 10, '-', 'left')); // '------test'
console.log(str_pad('test', 10, '-=', 'both')); // '-=-test-=-'
*/
function str_pad(input, padLength, padString = ' ', padType = 'right') {
    input = String(input);
    padString = String(padString);
    
    if (padString === '' || padLength <= input.length) {
        return input;
    }
    
    const padCount = padLength - input.length;
    const padText = padString.repeat(Math.ceil(padCount / padString.length)).slice(0, padCount);
    
    switch (padType) {
        case 'left':
            return padText + input;
        case 'both':
            const leftPad = Math.floor(padCount / 2);
            const rightPad = padCount - leftPad;
            return padString.repeat(leftPad) + input + padString.repeat(rightPad);
        case 'right':
        default:
            return input + padText;
    }
}

/*
// Использование:
console.log(str_repeat('-', 10)); // '----------'
console.log(str_repeat('abc', 3)); // 'abcabcabc'

// Или используйте нативный метод:
console.log('-'.repeat(10)); // '----------'
*/
function str_repeat(input, multiplier) {
    if (multiplier < 0 || !isFinite(multiplier)) {
        throw new Error('Count must be non-negative and finite');
    }
    
    multiplier = Math.floor(multiplier);
    
    // Встроенный метод String.prototype.repeat уже существует
    return String(input).repeat(multiplier);
}

/*
// Использование:
console.log(number_format(1234.567, 2, '.', ',')); // '1,234.57'
console.log(number_format(1234.567, 0, ',', ' ')); // '1 235'
console.log(number_format(-1234.567, 2)); // '-1,234.57'
console.log(number_format(1234567.89, 2, ',', '.')); // '1.234.567,89'
*/
function number_format(number, decimals = 0, decimalSeparator = '.', thousandsSeparator = ',') {
    if (isNaN(number) || !isFinite(number)) {
        return '0';
    }
    
    number = Number(number);
    
    // Округляем до указанного количества знаков
    const fixedNumber = Math.abs(number).toFixed(decimals);
    
    // Разделяем целую и дробную части
    let [integerPart, decimalPart] = fixedNumber.split('.');
    
    // Добавляем разделители тысяч
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    
    // Собираем результат
    let result = integerPart;
    if (decimals > 0 && decimalPart) {
        result += decimalSeparator + decimalPart;
    }
    
    // Добавляем знак минус для отрицательных чисел
    return number < 0 ? '-' + result : result;
}
