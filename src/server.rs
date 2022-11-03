#![forbid(unsafe_code)]
#![allow(non_camel_case_types, non_snake_case)]
#![cfg_attr(feature = "wasm", allow(dead_code))]

use eframe::egui;
use turbocharger::prelude::*;

mod app;

#[tokio::main(flavor = "multi_thread", worker_threads = 10)]
#[tracked]
async fn main() -> Result<(), tracked::StringError> {
	let addr = std::net::SocketAddr::from(([127, 0, 0, 1], 18493));

	let app =
		axum::Router::new().route("/turbocharger_socket", axum::routing::get(turbocharger::ws_handler));

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
		egui::CentralPanel::default().show(ctx, |ui| {
			ui.heading("Hello World!");
		});
		ctx.request_repaint();
	}
}
