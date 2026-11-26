import { describe, expect, it } from "vitest";
import { parseEcbCsv } from "./ecb";
import snapshot from "./snapshot.json";
import { lastYears, trendOf } from "./trend";

const CSV = `KEY,FREQ,REF_AREA,BS_REP_SECTOR,BS_ITEM,MATURITY_NOT_IRATE,DATA_TYPE_MIR,AMOUNT_CAT,BS_COUNT_SECTOR,CURRENCY_TRANS,IR_BUS_COV,TIME_PERIOD,OBS_VALUE
MIR.M.BE.B.A2C.P.R.A.2250.EUR.N,M,BE,B,A2C,P,R,A,2250,EUR,N,2026-06,3.47
MIR.M.BE.B.A2C.P.R.A.2250.EUR.N,M,BE,B,A2C,P,R,A,2250,EUR,N,2026-09,3.59
MIR.M.BE.B.A2C.A.R.A.2250.EUR.N,M,BE,B,A2C,A,R,A,2250,EUR,N,2026-09,3.76
MIR.M.BE.B.A2C.F.R.A.2250.EUR.N,M,BE,B,A2C,F,R,A,2250,EUR,N,2026-09,4.79
MIR.M.BE.B.A2C.F.R.A.2250.EUR.N,M,BE,B,A2C,F,R,A,2250,EUR,N,2026-10,NaN`;

describe("parseEcbCsv", () => {
  it("groups the three series per month and skips invalid values", () => {
    const points = parseEcbCsv(CSV);
    expect(points).toEqual([
      { month: "2026-06", fixedLong: 3.47 },
      { month: "2026-09", fixedLong: 3.59, all: 3.76, variable: 4.79 },
    ]);
  });

  it("rejects an unexpected header", () => {
    expect(() => parseEcbCsv("A,B\n1,2")).toThrow();
  });
});

describe("trendOf", () => {
  it("compares with 3 months earlier", () => {
    const t = trendOf(parseEcbCsv(CSV), "fixedLong");
    expect(t?.latest).toEqual({ month: "2026-09", value: 3.59 });
    expect(t?.change3m).toBe(0.12);
    expect(t?.direction).toBe("up");
  });

  it("is flat for small changes and down for drops", () => {
    const points = [
      { month: "2026-01", fixedLong: 3.5 },
      { month: "2026-04", fixedLong: 3.52 },
    ];
    expect(trendOf(points, "fixedLong")?.direction).toBe("flat");
    expect(
      trendOf([...points, { month: "2026-07", fixedLong: 3.3 }], "fixedLong")
        ?.direction,
    ).toBe("down");
  });
});

describe("snapshot", () => {
  it("covers at least 20 years of fixed-rate data", () => {
    const points = snapshot.points;
    expect(points.length).toBeGreaterThan(240);
    expect(lastYears(points, 20).length).toBeGreaterThanOrEqual(239);
    expect(points.at(-1)?.fixedLong).toBeGreaterThan(0);
  });
});
