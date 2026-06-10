const ANSI = {
    reset:   "\x1b[0m",
    bold:    "\x1b[1m",
    dim:     "\x1b[2m",

    // Foreground
    white:   "\x1b[37m",
    gray:    "\x1b[90m",
    cyan:    "\x1b[36m",
    yellow:  "\x1b[33m",
    red:     "\x1b[31m",
    magenta: "\x1b[35m",

    // Background
    bgRed:   "\x1b[41m",
} as const;

export enum LogLevel {
    Debug = 0,
    Info  = 1,
    Warn  = 2,
    Error = 3,
    Fatal = 4,
}

interface LoggerOptions {
    /** Minimum level to emit. Defaults to Debug. */
    minLevel?: LogLevel;
    /** Include an ISO timestamp in each line. Defaults to true. */
    timestamps?: boolean;
    /** Write to a custom sink instead of console (useful for testing). */
    sink?: (line: string) => void;
}

interface LevelConfig {
    label:  string;
    color:  string;
    stream: "log" | "error";
}

const LEVEL_CONFIG: Record<LogLevel, LevelConfig> = {
    [LogLevel.Debug]: { label: "DBG", color: ANSI.gray,                        stream: "log"   },
    [LogLevel.Info]:  { label: "INF", color: ANSI.cyan,                        stream: "log"   },
    [LogLevel.Warn]:  { label: "WRN", color: ANSI.yellow,                      stream: "log"   },
    [LogLevel.Error]: { label: "ERR", color: ANSI.red,                         stream: "error" },
    [LogLevel.Fatal]: { label: "FTL", color: `${ANSI.bold}${ANSI.bgRed}${ANSI.white}`, stream: "error" },
};

export class Logger {
    private readonly prefix:     string;
    private readonly minLevel:   LogLevel;
    private readonly timestamps: boolean;
    private readonly sink:       (line: string) => void;
    private readonly ASCII_ART:  string;

    constructor(prefix: string, options: LoggerOptions = {}) {
        this.prefix     = prefix;
        this.minLevel   = options.minLevel   ?? LogLevel.Debug;
        this.timestamps = options.timestamps ?? true;
        this.sink       = options.sink       ?? null!;
        this.ASCII_ART = `
   $XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX$   
 $XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX$ 
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXXXXXXXXXX
XXXXXXXXX;           :XX:                                 ;XXXXXXXXXX
XXXXXXXXx           :XXXX+  ;XXx.                .+X:     :xXXXXXXXXX
XXXXXXXXx          ;XX+:XXx+XXXXX:               .xX;     :xXXXXXXXXX
XXXXXXXXx         :XX;   xXXX; ;XX;           ;+++XXx++;: :xXXXXXXXXX
XXXXXXXXx         XX+    :XXx   ;XX:         .+XXXXXXXXX; :xXXXXXXXXX
XXXXXXXXx        +XX.     :XX;   xXX.            .xX;     :xXXXXXXXXX
XXXXXXXXx       .xX;       ;Xx:  .XX;            .xX;     :xXXXXXXXXX
XXXXXXXXx       :XX:       .xX;   +X+.                    :xXXXXXXXXX
XXXXXXXXx       ;Xx.        +X+   ;Xx.                    :xXXXXXXXXX
XXXXXXXXx       ;Xx.        +XXXXXXXXX++.                 :xXXXXXXXXX
XXXXXXXXx       +X+.     :xXXX++;;;;;+xXXX+:              :xXXXXXXXXX
XXXXXXXXx       ;Xx.   :XXX+.           :xXXX+:           :xXXXXXXXXX
XXXXXXXXx       ;Xx: .+XX;       :;;:      :+XXXXXx++;:::.:xXXXXXXXXX
XXXXXXXXx       :xX::xX+.      +XXXXXX+.       :;;++xXXXXXXXXXXXXXXXX
XXXXXXXXx        +XXXX+       ;XX.  :xX;                     .XXXXXXX
XXXXXXXXx        ;XXX:        ;X+    +X;                     :XXXXXXX
XXXXXXXXx       :xXx.                                       .+XXXXXXX
XXXXXXXXx     .+XX+                                        :XXXXXXXXX
XXXXXXXXx   .+XXx.                                      .+XXXXXXXXXXX
XXXXXXXXx+xXXX+:                               ..::;++xXXXXXXXXXXXXXX
XXXXXXXXX++;.                       ::;++XXXXXXXXXXXXXXXx+:xXXXXXXXXX
XXXXXXXX+                      .;XXXXXXxx+;::.:+XXXXxx;   .xXXXXXXXXX
XXXXXXXXx                  .;xXXXx;..     :+XXXX+;:.      .xXXXXXXXXX
XXXXXXXX+               .;xXX+;.       .+XXx;:            .xXXXXxXxXx
XXxXxXxX+             :xXX+:         .+Xx+.               .xXxXXXXXXX
xXXXXXXXx           ;xXx;           +XX+.                 :xXXxXxXxXX
XxXxXxXxX;        ;xX+:           ;XX+.                   ;xXxXXXXXxX
xXXxXXxXxXx++++++xXXx++++++++++++XxXx++++++++++++++++++++XxXxXxXxxXXx
XxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXXxXX
XXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXX
 XXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXX 
   XXXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxxXX   
`
    }

    // ── Public API ────────────────────────────────────────────────────────────
    start(): void { this.emit(LogLevel.Info, this.ASCII_ART, []); }
    debug(message: string, ...args: unknown[]): void { this.emit(LogLevel.Debug, message, args); }
    info (message: string, ...args: unknown[]): void { this.emit(LogLevel.Info,  message, args); }
    warn (message: string, ...args: unknown[]): void { this.emit(LogLevel.Warn,  message, args); }
    error(message: string, ...args: unknown[]): void { this.emit(LogLevel.Error, message, args); }

    fatal(message: string, ...args: unknown[]): never {
        this.emit(LogLevel.Fatal, message, args);
        process.exit(1);
    }

    /**
     * Returns a child logger that inherits all options but prepends an
     * additional namespace: `[parent:child]`.
     */
    child(namespace: string): Logger {
        return new Logger(`${this.prefix}:${namespace}`, {
        minLevel:   this.minLevel,
        timestamps: this.timestamps,
        sink:       this.sink ?? undefined,
        });
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private emit(level: LogLevel, message: string, args: unknown[]): void {
        if (level < this.minLevel) return;

        const cfg        = LEVEL_CONFIG[level];
        const timestamp  = this.timestamps ? this.formatTimestamp() : "";
        const levelTag   = `${cfg.color}${ANSI.bold}[${cfg.label}]${ANSI.reset}`;
        const prefixTag  = `${ANSI.magenta}[${this.prefix}]${ANSI.reset}`;
        const body       = args.length ? `${message} ${this.formatArgs(args)}` : message;
        const line       = [timestamp, levelTag, prefixTag, body].filter(Boolean).join(" ");

        if (this.sink) {
        this.sink(line);
        return;
        }

        // Route errors/fatals to stderr so they can be piped separately.
        cfg.stream === "error" ? console.error(line) : console.log(line);
    }

    private formatTimestamp(): string {
        const now = new Date().toISOString().replace("T", " ").slice(0, 23);
        return `${ANSI.dim}${ANSI.gray}${now}${ANSI.reset}`;
    }

    private formatArgs(args: unknown[]): string {
        return args
        .map(a =>
            a instanceof Error
            ? `\n${ANSI.red}${a.stack ?? a.message}${ANSI.reset}`
            : typeof a === "object"
            ? JSON.stringify(a, null, 2)
            : String(a),
        )
        .join(" ");
    }
}