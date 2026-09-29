import { describe, expect, it } from "vitest";

import {
  captionFromFileName,
  closedWeekdaysFromHours,
  formatDayHours,
  hoursSummary,
  parseDayHours,
  TIME_OPTIONS,
  loungeIdFromName,
  makeMainPhoto,
  publishChecklist,
  type LoungeDraftInput,
} from "./lounge-draft";

describe("captionFromFileName — nombre por defecto de una foto", () => {
  it("quita la extensión y cambia guiones por espacios", () => {
    expect(captionFromFileName("una-foto-cualquiera.jpg")).toBe("una foto cualquiera");
  });

  it("también trata los guiones bajos y los separadores repetidos", () => {
    expect(captionFromFileName("main__room--north.JPEG")).toBe("main room north");
  });

  it("solo quita la última extensión", () => {
    expect(captionFromFileName("bar.v2.png")).toBe("bar.v2");
  });

  it("un archivo sin extensión conserva su nombre", () => {
    expect(captionFromFileName("terrace")).toBe("terrace");
  });
});

describe("loungeIdFromName — id legible del lounge nuevo", () => {
  it("pasa el nombre a kebab-case sin acentos ni signos", () => {
    expect(loungeIdFromName("The Larkspur")).toBe("the-larkspur");
    expect(loungeIdFromName("  Café & Salón Nº 5 ")).toBe("cafe-salon-n-5");
  });
});

describe("makeMainPhoto — la foto principal va primera", () => {
  it("mueve la elegida al principio y conserva el orden del resto", () => {
    expect(makeMainPhoto(["a", "b", "c"], 2)).toEqual(["c", "a", "b"]);
  });

  it("elegir la que ya es principal no cambia nada", () => {
    expect(makeMainPhoto(["a", "b"], 0)).toEqual(["a", "b"]);
  });
});

describe("horario → días cerrados y resumen", () => {
  const week = ["Closed", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "9 AM – 6 PM"];

  it("un día marcado Closed (domingo primero) cierra ese weekday", () => {
    expect(closedWeekdaysFromHours(week)).toEqual([0]);
  });

  it("el resumen del catálogo usa la hora de cierre del primer día abierto", () => {
    expect(hoursSummary(week)).toBe("Open until 9 PM");
  });
});

describe("publishChecklist — antes de poder publicar", () => {
  const complete: LoungeDraftInput = {
    name: "The Larkspur",
    phone: "+1 212 555 0148",
    email: "hello@thelarkspur.com",
    website: "",
    location: {
      address: "27 Bond Street",
      neighborhood: "NoHo",
      city: "New York",
      lat: 40.7262,
      lng: -73.9936,
    },
    weeklyHours: ["Closed", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "8 AM – 9 PM", "9 AM – 6 PM"],
    amenities: ["wifi"],
    capacity: 24,
    bookingRestrictions: [],
    partners: [{ firstName: "Camille", lastName: "Duarte", email: "camille.duarte@thelarkspur.com", mobile: "+1 917 555 0163" }],
  };

  it("con todo relleno, los cinco requisitos están cumplidos", () => {
    const checklist = publishChecklist(complete);
    expect(checklist.map((item) => item.done)).toEqual([true, true, true, true, true]);
  });

  it("sin partners no se puede publicar: son a quienes se invita al publicar", () => {
    const checklist = publishChecklist({ ...complete, partners: [] });
    expect(checklist.find((item) => item.id === "partner")?.done).toBe(false);
  });

  it("un lounge que ya tuvo partners vinculados puede publicarse sin pendientes nuevos", () => {
    const checklist = publishChecklist({ ...complete, partners: [], linkedPartners: 2 });
    expect(checklist.find((item) => item.id === "partner")?.done).toBe(true);
  });

  it("cada partner necesita nombre, apellido y un email válido; el móvil es opcional", () => {
    const partner = complete.partners[0];
    const done = (changes: Partial<typeof partner>) =>
      publishChecklist({ ...complete, partners: [{ ...partner, ...changes }] }).find((item) => item.id === "partner")?.done;

    expect(done({ mobile: "" })).toBe(true);
    expect(done({ lastName: " " })).toBe(false);
    expect(done({ email: "camille.duarte" })).toBe(false);
  });

  it("sin dirección elegida del mapa no se puede publicar", () => {
    const checklist = publishChecklist({ ...complete, location: null });
    expect(checklist.find((item) => item.id === "location")?.done).toBe(false);
  });

  it("sin teléfono, el contacto queda pendiente", () => {
    const checklist = publishChecklist({ ...complete, phone: " " });
    expect(checklist.find((item) => item.id === "contact")?.done).toBe(false);
  });

  it("todos los días cerrados no cuenta como horario", () => {
    const checklist = publishChecklist({ ...complete, weeklyHours: Array(7).fill("Closed") });
    expect(checklist.find((item) => item.id === "hours")?.done).toBe(false);
  });

  it("cero plazas por franja no se puede publicar", () => {
    const checklist = publishChecklist({ ...complete, capacity: 0 });
    expect(checklist.find((item) => item.id === "seats")?.done).toBe(false);
  });
});

describe("horario de un día con desplegables", () => {
  it("ofrece las horas del día cada 30 minutos", () => {
    expect(TIME_OPTIONS).toHaveLength(48);
    expect(TIME_OPTIONS[0]).toBe("12:00 AM");
    expect(TIME_OPTIONS[17]).toBe("8:30 AM");
    expect(TIME_OPTIONS[47]).toBe("11:30 PM");
  });

  it("un día abierto se guarda como 'apertura – cierre'", () => {
    expect(formatDayHours({ open: true, from: "8:00 AM", to: "9:00 PM" })).toBe("8:00 AM – 9:00 PM");
  });

  it("un día cerrado se guarda como Closed", () => {
    expect(formatDayHours({ open: false, from: "8:00 AM", to: "9:00 PM" })).toBe("Closed");
  });

  it("lee el formato guardado, también el corto de los lounges sembrados", () => {
    expect(parseDayHours("8:00 AM – 11:00 PM")).toEqual({ open: true, from: "8:00 AM", to: "11:00 PM" });
    expect(parseDayHours("9 AM – 6 PM")).toEqual({ open: true, from: "9:00 AM", to: "6:00 PM" });
  });

  it("un día vacío o Closed se lee como cerrado", () => {
    expect(parseDayHours("Closed").open).toBe(false);
    expect(parseDayHours("").open).toBe(false);
  });
});
