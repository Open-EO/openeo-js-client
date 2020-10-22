export function Lexer(): {
    reset: (str: any) => void;
    next: () => {
        type: any;
        value: any;
        start: number;
        end: number;
    };
    peek: () => {
        type: any;
        value: any;
        start: number;
        end: number;
    };
};
export function Parser(): {
    parse: (expression: any) => {
        Expression: any;
    };
};
