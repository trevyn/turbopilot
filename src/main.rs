#![forbid(unsafe_code)]
// #![allow(non_camel_case_types, non_snake_case)]
// #![cfg_attr(feature = "wasm", allow(dead_code))]

use eframe::egui;
use std::{net::SocketAddr, sync::Mutex};
use tracked::tracked;

use axum::{
	body::{boxed, Full},
	extract::{
		ws::{Message, WebSocket, WebSocketUpgrade},
		ConnectInfo, TypedHeader,
	},
	headers,
	http::{header, header::HeaderMap, StatusCode, Uri},
	response::{IntoResponse, Response},
	routing::{get, Router},
	Server,
};

static VISIBLE: Mutex<bool> = Mutex::new(false);

#[tokio::main(flavor = "multi_thread", worker_threads = 10)]
#[tracked]
async fn main() -> Result<(), tracked::StringError> {
	let addr = std::net::SocketAddr::from(([127, 0, 0, 1], 18493));

	let app = axum::Router::new().route("/turbocharger_socket", axum::routing::get(ws_handler));

	tokio::spawn(async move {
		axum::Server::bind(&addr)
			.serve(app.into_make_service_with_connect_info::<std::net::SocketAddr>())
			.await
			.unwrap();
	});

	eframe::run_native(
		"turbopilot",
		eframe::NativeOptions { always_on_top: true, ..Default::default() },
		Box::new(|cc| Box::new(MyEguiApp::new(cc))),
	);

	Ok(())
}

pub async fn ws_handler(
	ws: WebSocketUpgrade,
	user_agent: Option<TypedHeader<headers::UserAgent>>,
	ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> impl IntoResponse {
	eprintln!("websocket connecting from {}", addr);

	let ua_str =
		if let Some(TypedHeader(ua)) = user_agent { ua.as_str().into() } else { String::new() };

	ws.on_upgrade(move |ws| handle_socket(ws, ua_str, addr))
}

async fn handle_socket(ws: WebSocket, ua: String, addr: SocketAddr) {
	eprintln!("websocket connected");
	*VISIBLE.lock().unwrap() = true;
}

#[derive(Default)]
struct MyEguiApp {}

impl MyEguiApp {
	fn new(cc: &eframe::CreationContext<'_>) -> Self {
		// Customize egui here with cc.egui_ctx.set_fonts and cc.egui_ctx.set_visuals.
		// Restore app state using cc.storage (requires the "persistence" feature).
		// Use the cc.gl (a glow::Context) to create graphics shaders and buffers that you can use
		// for e.g. egui::PaintCallback.
		Self::default()
	}
}

impl eframe::App for MyEguiApp {
	fn update(&mut self, ctx: &egui::Context, frame: &mut eframe::Frame) {
		frame.set_visible(*VISIBLE.lock().unwrap());
		egui::CentralPanel::default().show(ctx, |ui| {
			ui.heading("Hello World!");
		});
		ctx.request_repaint();
	}
}
